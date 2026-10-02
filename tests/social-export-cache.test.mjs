import test from 'node:test';
import assert from 'node:assert/strict';
import { renderConfigKey, sourceFingerprint, cachedExport } from '../scripts/social/export-cache.mjs';
import { featurePosters } from '../social/data/feature-campaign.js';

test('render cache separates visual edits, formats and animation duration', () => {
  const p = featurePosters[0], key = renderConfigKey(p, 'portrait', 'mp4');
  assert.equal(renderConfigKey({ ...p, caption: 'New caption', background: '', gameplayImage: '' }, 'portrait', 'mp4'), key);
  for (const edit of [{ headline: 'Different' }, { palette: 'red' }, { motionDuration: 6 }, { decoration: false }])
    assert.notEqual(renderConfigKey({ ...p, ...edit }, 'portrait', 'mp4'), key);
  assert.notEqual(renderConfigKey(p, 'story', 'mp4'), key);
  assert.notEqual(renderConfigKey(p, 'portrait', 'png'), key);
});
test('cache identity covers actual poster source and approved art', async () => {
  const fingerprint = await sourceFingerprint();
  assert.match(fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(await sourceFingerprint(), fingerprint);
});
test('finished feature motion is reusable but an edited headline is never served stale', async () => {
  const p = featurePosters[0];
  const ready = await cachedExport(p, 'portrait', 'mp4');
  assert.ok(ready.endsWith('20-friend-invites-portrait.mp4'));
  assert.equal(await cachedExport({ ...p, headline: 'Edited headline' }, 'portrait', 'mp4'), null);
});
