import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const game = await readFile(new URL('play/index.html', root), 'utf8');
const trailer = await readFile(new URL('index.html', root), 'utf8');
const legacyTrailer = await readFile(new URL('trailer.html', root), 'utf8');
const gate = trailer.match(/<script id="legacy-game-entry">([\s\S]*?)<\/script>/)?.[1];

function destination(href) {
  const url = new URL(href);
  let redirected = null;
  const location = {
    protocol: url.protocol, pathname: url.pathname, search: url.search,
    hash: url.hash, href: url.href, replace: (next) => { redirected = next; },
  };
  runInNewContext(gate, { location, URL });
  return redirected;
}

test('homepage serves KONK content and links to the separate game', () => {
  assert.ok(gate);
  assert.equal(destination('https://konk.world/'), null);
  assert.equal(destination('https://konk.world/?utm_source=instagram'), null);
  assert.match(trailer, /class="top-play" href="\/play\/"/);
  assert.match(game, /<base href="\/"/);
  assert.match(game, /class="home-trailer-link" href="\/"/);
  assert.match(legacyTrailer, /location\.replace\('\/'/);
  assert.match(trailer, /<link rel="canonical" href="https:\/\/konk\.world\/">/);
  assert.match(trailer, /poster="\/promo\/konk-trailer\//);
  assert.match(trailer, /href="\/styles\/trailer-page\.css/);
});

test('old play and invitation links preserve their details at the new game route', () => {
  assert.equal(destination('https://konk.world/?play=1'), 'https://konk.world/play/');
  assert.equal(destination('https://konk.world/?room=ABCDE'), 'https://konk.world/play/?room=ABCDE');
  assert.equal(destination('https://konk.world/?beat=schoolyard&m=legends&s=2-1'), 'https://konk.world/play/?beat=schoolyard&m=legends&s=2-1');
  assert.equal(destination('konk-local://game/index.html'), null);
});

test('installed web app launches straight into play', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'));
  assert.equal(manifest.start_url, '/play/');
});

test('homepage link arrows are matching vectors rather than mobile emoji glyphs', async () => {
  const css = await readFile(new URL('styles/trailer-page.css', root), 'utf8');
  const arrows = [...trailer.matchAll(/<svg class="link-arrow"[^>]*>[\s\S]*?<\/svg>/g)];
  assert.equal(arrows.length, 4);
  for (const arrow of arrows) assert.equal(arrows[0][0], arrow[0]);
  assert.match(arrows[0][0], /stroke="currentColor"/);
  assert.match(arrows[0][0], /aria-hidden="true" focusable="false"/);
  assert.doesNotMatch(trailer, /↗/);
  assert.match(css, /\.link-arrow \{[^}]*width: 18px; height: 18px; flex: 0 0 18px/);
  assert.match(css, /\.top-follow \.link-arrow \{ color: var\(--gold\); \}/);
  assert.match(css, /\.top-play \.link-arrow \{ color: var\(--ink\); \}/);
});

test('both pages share the matching arrow and hand cursors', async () => {
  const css = await readFile(new URL('styles/konk-brand-cursors.css', root), 'utf8');
  const grip = await readFile(new URL('assets/konk-cursor-hold.svg', root), 'utf8');
  assert.match(game, /styles\/konk-brand-cursors\.css\?v=4/);
  assert.match(trailer, /styles\/konk-brand-cursors\.css\?v=4/);
  assert.match(css, /--konk-arrow: url\(/);
  assert.match(css, /--konk-hand: url\(/);
  assert.equal((css.match(/fill='%23faf5e2'/g) ?? []).length, 2);
  assert.match(css, /--konk-hold: url\('\.\.\/assets\/konk-cursor-hold\.svg'\) 13 10/);
  assert.match(grip, /fill="#faf5e2"/);
  assert.match(grip, /stroke="#0c1110"/);
  assert.match(css, /cursor: var\(--konk-hand\), pointer !important/);
  assert.match(css, /#game-canvas \{ cursor: var\(--konk-hand\), pointer !important; \}/);
  assert.match(css, /#game-canvas\.can-grab, #game-canvas\.aiming \{ cursor: var\(--konk-hold\), grabbing !important; \}/);
});

test('portrait trailer uses balanced 16px gutters without a viewport-height width cap', async () => {
  const css = await readFile(new URL('styles/trailer-page.css', root), 'utf8');
  assert.match(css, /@media \(max-width: 680px\) and \(orientation: portrait\) \{\s*\.video-frame \{ width: min\(calc\(100% - 32px\), 540px\); \}/);
  assert.match(css, /\.trailer-video \{[^}]*object-fit: contain/);
  assert.match(css, /aspect-ratio: 9 \/ 16/);
  assert.match(trailer, /trailer-page\.css\?v=9/);
});

test('room format picker has a defined brand accent and dark options', async () => {
  const css = await readFile(new URL('styles/tournament-room.css', root), 'utf8');
  assert.match(game, /styles\/tournament-room\.css\?v=3/);
  assert.match(css, /\.screen-live-room \.name-field \{ --chip: var\(--yellow\); \}/);
  assert.doesNotMatch(game, /<select id="live-room-format"/);
  assert.match(game, /type="hidden" id="live-room-format" value="duel"/);
  assert.equal((game.match(/name="room-format-choice"/g) ?? []).length, 2);
  assert.match(css, /\.room-format-options label:has\(input:checked\) \{ background: var\(--yellow\); color: var\(--ink\); \}/);
  assert.match(css, /\.room-format-options \{[^}]*background: var\(--ink-raised\)/);
});

test('nested control artwork inherits branded cursors and grip is preloaded', async () => {
  const css = await readFile(new URL('styles/konk-brand-cursors.css', root), 'utf8');
  assert.match(css, /body \* \{ cursor: inherit !important; \}/);
  assert.match(css, /body input:is\([^\n]*\[type='radio'\][^\n]*\[type='range'\]/);
  assert.match(css, /input:not\(:is\([^\n]*\[type='checkbox'\]/);
  assert.match(css, /#camera-orbit[^\n]*cursor: var\(--konk-hold\)/);
  for (const page of [game, trailer]) {
    assert.match(page, /rel="preload" as="image" href="\/?assets\/konk-cursor-hold\.svg" media="\(hover: hover\) and \(pointer: fine\)"/);
  }
});
