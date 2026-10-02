import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { posters } from '../social/data/campaign.js';
import { exportIdentity, hasVisualEdits, hasFinishedMotion } from '../social/data/export-identity.js';
import { renderConfigKey } from '../scripts/social/export-cache.mjs';
import { createHash } from 'node:crypto';

test('finished and browser exports use identical visual identities, never stale edited art', () => {
  const p = posters.find(p => p.feature === 'voice');
  assert.equal(createHash('sha256').update(exportIdentity(p, 'portrait', 'png')).digest('hex'), renderConfigKey(p, 'portrait', 'png'));
  assert.equal(hasVisualEdits({ ...p, caption: 'Caption only' }, p, 'portrait', 'png'), false);
  for (const edit of [{ headline: 'New copy' }, { background: '#000000' }, { gameplayImage: 'data:image/png;base64,AAA=' }])
    assert.equal(hasVisualEdits({ ...p, ...edit }, p, 'portrait', 'png'), true);
  assert.equal(hasFinishedMotion(p, 'portrait'), true);
  assert.equal(hasFinishedMotion(p, 'story'), false);
  assert.equal(hasFinishedMotion(posters.find(p => p.id === '19-twi-first'), 'story'), true);
});
test('hosted exports do not depend on a localhost service or silently ignore edits', async () => {
  const script = await readFile(new URL('../social/studio.js', import.meta.url), 'utf8');
  const browser = await readFile(new URL('../social/components/browser-export.js', import.meta.url), 'utf8');
  assert.match(script, /location.hostname/);
  assert.match(script, /browserExport\(request, message\)/);
  assert.match(browser, /entry.renderKey === key/);
  assert.match(browser, /blob \?\?= await renderPNG/);
  assert.match(browser, /Custom motion exports need the local render service/);
});
test('campaign clearly announces voice chat and preserves exact Twi-first copy', async () => {
  const voice = posters.find(p => p.feature === 'voice');
  assert.equal(voice.headline, 'VOICE CHAT\nFINALLY DEY HERE.');
  assert.match(voice.caption, /You people ask. Voice chat finally dey here/);
  assert.match(voice.caption, /private room/i);
  assert.match(voice.caption, /microphone stays off/);
  assert.match(voice.caption, /You dey talk plenty/);
  assert.doesNotMatch(voice.caption, /Talk am|Run am back/);
  const art = await readFile(new URL('../social/components/feature-art.js', import.meta.url), 'utf8');
  assert.match(art, /Chale, see goal/);
  assert.doesNotMatch(art, /Talk am|Run am back/);
  const twi = posters.find(p => p.id === '19-twi-first');
  assert.equal(twi.headline, 'YƐ KONKI!');
  assert.equal(twi.question, 'Wo nim counters ball?');
  assert.equal(twi.closing, 'KONKERS, mo ayɛ ready?');
});
