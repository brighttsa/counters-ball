import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const game = await readFile(new URL('index.html', root), 'utf8');
const trailer = await readFile(new URL('trailer.html', root), 'utf8');
const gate = game.match(/<script id="web-trailer-entry">([\s\S]*?)<\/script>/)?.[1];

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

test('plain web visits see the trailer before the game loads', () => {
  assert.ok(gate);
  assert.equal(destination('https://konk.world/'), 'https://konk.world/trailer.html');
  assert.equal(destination('https://konk.world/index.html'), 'https://konk.world/trailer.html');
  assert.match(trailer, /class="top-play" href="\/\?play=1"/);
});

test('play, invitation and offline iOS entry go straight to the game', () => {
  assert.equal(destination('https://konk.world/?play=1'), null);
  assert.equal(destination('https://konk.world/?room=ABCDE'), null);
  assert.equal(destination('https://konk.world/?beat=schoolyard'), null);
  assert.equal(destination('konk-local://game/index.html'), null);
});

test('installed web app launches straight into play', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'));
  assert.equal(manifest.start_url, '/?play=1');
});

test('both pages share the matching arrow and hand cursors', async () => {
  const css = await readFile(new URL('styles/konk-brand-cursors.css', root), 'utf8');
  assert.match(game, /styles\/konk-brand-cursors\.css\?v=2/);
  assert.match(trailer, /styles\/konk-brand-cursors\.css\?v=2/);
  assert.match(css, /--konk-arrow: url\(/);
  assert.match(css, /--konk-hand: url\(/);
  assert.equal((css.match(/fill='%23faf5e2'/g) ?? []).length, 2);
  assert.match(css, /cursor: var\(--konk-hand\), pointer !important/);
  assert.match(css, /#game-canvas \{ cursor: var\(--konk-hand\), pointer !important; \}/);
});

test('room format picker has a defined brand accent and dark options', async () => {
  const css = await readFile(new URL('styles/tournament-room.css', root), 'utf8');
  assert.match(game, /styles\/tournament-room\.css\?v=2/);
  assert.match(css, /\.screen-live-room \.name-field \{ --chip: var\(--yellow\); \}/);
  assert.match(css, /appearance: none; color-scheme: dark/);
  assert.match(css, /select option \{ color: var\(--paper\); background: var\(--ink-raised\); \}/);
  assert.match(css, /select option:checked \{ color: var\(--ink\); background: var\(--yellow\); \}/);
});
