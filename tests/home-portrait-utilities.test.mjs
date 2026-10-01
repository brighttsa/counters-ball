import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('play/index.html', root), 'utf8');
const css = await readFile(new URL('styles/home-portrait-utilities.css', root), 'utf8');

test('portrait Home utilities give Settings and Credits separate equal-width cells', () => {
  assert.match(html, /home-portrait-utilities\.css\?v=1/);
  assert.ok(html.indexOf('home-portrait-utilities.css') > html.indexOf('native-ios-ui-quality.css'));
  assert.match(html, /<button type="button" data-action="home-settings">Settings<\/button>/);
  assert.match(css, /@media \(max-width: 700px\) and \(orientation: portrait\)/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.home-trailer-link \{\s*grid-column: 1 \/ -1/);
  assert.match(css, /min-height: 48px/);
  assert.match(css, /touch-action: manipulation/);
});

test('portrait Home controls remain reachable on short viewports and enlarged text', () => {
  assert.match(css, /overflow-y: auto/);
  assert.match(css, /justify-content: safe center/);
  assert.match(css, /flex-shrink: 0/);
  assert.match(css, /overflow-wrap: anywhere/);
});
