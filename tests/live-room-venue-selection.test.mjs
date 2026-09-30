import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN_LEVELS } from '../src/levels/campaign-level-definitions.js';
import { STREET_LEGENDS_ACTS } from '../src/levels/street-legends-acts-and-unlocks.js';
import { liveRoomVenueFor } from '../src/levels/live-room-venue-selection.js';

test('live rooms keep each featured venue but exclude solo moving mechanics', () => {
  for (const act of STREET_LEGENDS_ACTS) {
    const venue = liveRoomVenueFor(act, CAMPAIGN_LEVELS);
    assert.equal(venue.backdrop, act.backdrop);
    assert.equal(venue.mechanic, undefined);
    assert.equal(venue.name, act.name);
  }
});
