import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('GitHub Pages publishes the ranked standings entry point', async () => {
  const workflow = await readFile(new URL('../.github/workflows/deploy-game-to-github-pages.yml', import.meta.url), 'utf8');
  assert.match(workflow, /cp -R[^\n]*\bstandings\b[^\n]*_site\//);
  const html = await readFile(new URL('../standings/index.html', import.meta.url), 'utf8');
  assert.match(html, /standings\.js/);
});
