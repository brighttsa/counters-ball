import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { posters, formats } from '../social/data/campaign.js';
import { renderConfigKey, sourceFingerprint } from '../scripts/social/export-cache.mjs';

test('Pages publishes Campaign Studio and ships a portable, complete export catalog', async () => {
  const workflow = await readFile(new URL('../.github/workflows/deploy-game-to-github-pages.yml', import.meta.url), 'utf8');
  assert.match(workflow, /cp -R .*\bsocial\b.*_site\//);
  const entries = JSON.parse(await readFile(new URL('../social/exports/manifest.json', import.meta.url)));
  const fingerprint = await sourceFingerprint();
  assert.equal(entries.filter(e => e.kind === 'png').length, posters.length * Object.keys(formats).length);
  assert.equal(entries.filter(e => e.kind === 'mp4').length, 8);
  for (const entry of entries) {
    assert.equal(entry.path, undefined);
    assert.equal(entry.sourceHash, fingerprint);
    assert.equal(entry.renderKey, renderConfigKey(posters.find(p => p.id === entry.id), entry.format, entry.kind));
    assert.deepEqual(entry.overflow, []); assert.deepEqual(entry.errors, []);
  }
});
