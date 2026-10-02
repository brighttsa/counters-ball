import test from 'node:test';
import assert from 'node:assert/strict';
import { posters } from '../social/data/campaign.js';
import { filterCampaignPosters } from '../social/data/collection-filter.js';

test('feature collection covers six current and upcoming features without changing originals', () => {
  const features = posters.filter(p => p.group === 'New Features');
  assert.equal(features.length, 6);
  assert.deepEqual(features.map(p => p.feature), ['invite', 'knockout', 'rival', 'voice', 'profile', 'special']);
  assert.equal(posters.find(p => p.id === '19-twi-first').closing, 'KONKERS, mo ayɛ ready?');
  assert.equal(features.filter(p => p.motion).length, 3);
  for (const p of features) {
    assert.equal(p.layout, 'feature'); assert.ok(p.caption.includes('konk.world'));
    assert.equal(p.signature, 'YƐ KONKI!');
  }
});
test('campaign claims distinguish private voice, optional profiles and upcoming special moves', () => {
  const byFeature = feature => posters.find(p => p.feature === feature);
  assert.match(byFeature('voice').caption, /private room/i);
  assert.match(byFeature('voice').caption, /microphone stays off/i);
  assert.match(byFeature('profile').caption, /guest/i);
  assert.doesNotMatch(byFeature('profile').caption, /cloud saves|save all your progress/i);
  assert.match(byFeature('special').eyebrow, /COMING NEXT/);
  assert.match(byFeature('special').caption, /in development/i);
});
test('collection filtering supports group, copy search and Twi without mutating source', () => {
  assert.equal(filterCampaignPosters(posters, 'New Features').length, 6);
  assert.equal(filterCampaignPosters(posters, 'New Features', 'microphone')[0].feature, 'voice');
  assert.ok(filterCampaignPosters(posters, 'All', 'YƐ KONKI').length);
  assert.equal(filterCampaignPosters(posters, 'Series', 'no-such-copy').length, 0);
  assert.equal(posters.length, 25);
});
