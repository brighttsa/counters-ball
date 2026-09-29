import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('landscape flick meter has equal padding and optically centered text', async () => {
  const css = await readFile(new URL('styles/mobile-tablet-match-layout.css', root), 'utf8');
  const html = await readFile(new URL('index.html', root), 'utf8');

  assert.match(css, /height: 26px; align-items: center; padding: 4px 10px;/);
  assert.match(css, /height: 24px; align-items: center; padding-block: 4px;/);
  assert.match(css, /\.ink-game \.flick-meter > \* \{\s*position: relative; top: 1px; line-height: 1;/);
  assert.doesNotMatch(css, /padding(?:-block)?: 3px[^;]*5px/);
  assert.ok(html.includes('styles/mobile-tablet-match-layout.css?v=8'));
});
