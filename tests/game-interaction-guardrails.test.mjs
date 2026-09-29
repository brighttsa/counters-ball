import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('game document loads interaction guardrails after interface styles', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const guardrailLink = 'styles/game-interaction-guardrails.css?v=1';

  assert.ok(html.includes(guardrailLink));
  assert.ok(
    html.indexOf(guardrailLink) > html.indexOf('styles/native-ios-ui-quality.css'),
    'interaction guardrails should win the interface cascade',
  );
});

test('game UI blocks selection while preserving editable fields', async () => {
  const css = await readFile(
    new URL('styles/game-interaction-guardrails.css', root),
    'utf8',
  );

  assert.match(css, /body :not\(input\).*user-select: none/s);
  assert.match(
    css,
    /:not\(\[contenteditable='true'\]\)::selection[\s\S]*background: transparent/,
  );
  assert.match(css, /input, textarea, \[contenteditable='true'\][\s\S]*user-select: text/);
  assert.match(css, /input, textarea, \[contenteditable='true'\][\s\S]*caret-color: auto/);
  assert.match(css, /img, svg, canvas[\s\S]*-webkit-user-drag: none/);
});
