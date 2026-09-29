import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('compact layouts preserve the Apple 44 point interaction floor', async () => {
  const home = await readFile(new URL('styles/ink-impact-home.css', root), 'utf8');
  const menus = await readFile(new URL('styles/game-ui-menus-and-results.css', root), 'utf8');
  const native = await readFile(new URL('styles/native-ios-ui-quality.css', root), 'utf8');
  const circuit = await readFile(new URL('styles/circuit-venue-preview.css', root), 'utf8');
  const html = await readFile(new URL('index.html', root), 'utf8');

  assert.doesNotMatch(home, /min-height:\s*(?:38|40|42)px/);
  assert.match(menus, /\.intro-more summary[^}]*min-height:\s*44px/);
  assert.match(menus, /\.pause-face\[data-face-panel='settings'\] \.chip \{\s*min-height:\s*44px;/);
  assert.match(menus, /\.pause-card\[data-face='settings'\] \.chip \{ min-height: 44px;/);
  assert.match(menus, /\.room-fields \{ display: grid; gap: 16px; \}/);
  assert.match(native, /html\.konk-native \.room-fields \{\s*gap: 16px;/);
  assert.doesNotMatch(circuit, /screen-header \.btn \{ min-height: (?:36|40)px/);
  assert.ok(html.includes('styles/game-ui-menus-and-results.css?v=11'));
  assert.ok(html.includes('styles/ink-impact-home.css?v=13'));
  assert.ok(html.includes('styles/circuit-venue-preview.css?v=7'));
});
