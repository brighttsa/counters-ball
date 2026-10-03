import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { KONK_TERMS } from '../src/ui/konk-terminology.js';

const load = path => readFile(new URL(path, import.meta.url), 'utf8');

test('Home prioritizes the featured match, Street Legends and Play Together', async () => {
  const html = await load('../play/index.html');
  const home = html.slice(html.indexOf('data-screen="title"'), html.indexOf('data-screen="home-settings"'));
  assert.match(home, /YOUR NEXT MATCH/);
  assert.match(home, /data-action="play-featured"/);
  assert.match(home, /data-action="play-legends">Street Legends/);
  assert.match(home, /PLAY TOGETHER/);
  assert.match(home, /<details class="home-more">[\s\S]*Daily Flick[\s\S]*Practice with Kwame[\s\S]*All pitches[\s\S]*Settings[\s\S]*Credits/);
});

test('Play Together stages friend, rival and knockout choices before room controls', async () => {
  const html = await load('../play/index.html');
  const room = html.slice(html.indexOf('data-screen="live-room"'), html.indexOf('data-screen="letter"'));
  for (const path of ['friend', 'rival', 'knockout']) assert.match(room, new RegExp(`data-path="${path}"`));
  assert.match(room, /id="live-room-name-field" hidden/);
  assert.match(room, /id="live-room-code-field" hidden/);
  assert.match(room, /id="live-room-format-field" hidden/);
  assert.match(room, /data-action="live-room-copy" hidden>Share invite/);
  assert.match(room, /data-action="live-room-copy-code" hidden>Copy code/);
  const flow = await load('../src/ui/live-match-room-flow.js');
  assert.match(flow, /choosePath/);
  assert.match(flow, /path === 'knockout' \? 'tournament' : 'duel'/);
  assert.match(flow, /navigator\.share/);
  assert.match(flow, /async copyCode\(\)/);
  const actions = await load('../src/ui/menu-button-action-routes.js');
  assert.match(actions, /'live-room-path': \(el\) => liveRoom\.choosePath\(el\.dataset\.path\)/);
});

test('UI terms use the chosen player-facing language', async () => {
  assert.deepEqual(KONK_TERMS, {
    streetLegends: 'Street Legends', circuit: 'The Circuit', act: 'Act', pitch: 'Pitch', match: 'Match', table: 'Table',
  });
  const screens = await load('../src/ui/ui-menu-screens-title-levels-intro.js');
  assert.match(screens, /KONK_TERMS\.streetLegends/);
});

test('Street Legends and multiplayer choices stay readable on light hover/selected states', async () => {
  const html = await load('../play/index.html');
  const css = await load('../styles/konk-player-ux-hierarchy.css');
  assert.match(html, /styles\/konk-player-ux-hierarchy\.css\?v=1/);
  assert.match(css, /\.screen-title \.home-venues:hover small\s*\{\s*color:\s*var\(--ink\)/);
  assert.match(css, /\.screen-live-room \.room-path:hover b,[\s\S]*?\.screen-live-room \.room-path:hover small\s*\{\s*color:\s*var\(--ink\)/);
  assert.match(css, /\.screen-live-room \.room-path\[aria-pressed="true"\] b,[\s\S]*?\.screen-live-room \.room-path\[aria-pressed="true"\] small\s*\{\s*color:\s*var\(--ink\)/);
  assert.match(css, /outline: 3px solid var\(--yellow\)/);
  assert.match(css, /min-height: 44px/);
});
