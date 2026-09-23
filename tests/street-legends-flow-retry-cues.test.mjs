import test from 'node:test';
import assert from 'node:assert/strict';
import { STREET_LEGENDS_ACTS } from '../src/levels/street-legends-acts-and-unlocks.js';
import { streetLegendRetryCue } from '../src/levels/street-legends-flow-retry-cues.js';

test('every Street Legends venue has one mechanic-specific recovery cue', () => {
  const discover = STREET_LEGENDS_ACTS.filter(level => level.legend.act === 1);
  assert.equal(discover.length, 6);
  const cues = discover.map(streetLegendRetryCue);
  assert.equal(new Set(cues).size, 6);
  for (const cue of cues) assert.ok(cue?.length > 20);
  for (const level of STREET_LEGENDS_ACTS) {
    assert.equal(streetLegendRetryCue(level), streetLegendRetryCue(discover.find(act => act.legend.venue === level.legend.venue)));
  }
  assert.equal(streetLegendRetryCue({ mechanic: { type: 'toll-gates' } }), null);
});
