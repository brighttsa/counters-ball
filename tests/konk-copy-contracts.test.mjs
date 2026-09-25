import test from 'node:test';
import assert from 'node:assert/strict';
import { MENU_COPY, RESULTS_COPY, conditionObstacleCopy, resultTitle, starGoals, titleStarsCopy }
  from '../src/ui/konk-interface-copy.js';
import { ordinaryGoalDetail } from '../src/gameplay/konk-match-reaction-copy.js';
import { CAMPAIGN_LEVELS } from '../src/levels/campaign-level-definitions.js';
import { STREET_LEGENDS_ACTS } from '../src/levels/street-legends-acts-and-unlocks.js';

test('condition copy distinguishes fixed obstacles from an empty obstacle list', () => {
  assert.equal(conditionObstacleCopy(0), MENU_COPY.noObstacles);
  assert.equal(conditionObstacleCopy(3), '3 fixed obstacles');
  assert.equal(titleStarsCopy(2, 54), '2/54 stars'); // the star itself is an inline SVG (setTitleStars), not a glyph
  assert.equal(titleStarsCopy(0, 54), 'Six pitches. Six stories to settle.');
});

test('star criteria preserve the exact win and flick threshold', () => {
  assert.deepEqual(starGoals(7), ['Win', 'Concede no goals', 'Win in 7 flicks or fewer']);
});

test('results identify win, loss, local winner and draw without generic hype', () => {
  const names = { home: 'Ama', away: 'Kofi' };
  assert.equal(resultTitle('home', 'campaign', names, 'Yaw'), RESULTS_COPY.homeWin);
  assert.equal(resultTitle('away', 'campaign', names, 'Yaw'), 'Yaw takes it');
  assert.equal(resultTitle('away', 'versus', names, 'Yaw'), 'Kofi takes it.');
  assert.equal(resultTitle(null, 'versus', names, 'Yaw'), RESULTS_COPY.draw);
});

test('goal reactions rotate only among factual, short lines', () => {
  const base = { scorer: 'home', kid: 'Esi', names: { home: 'Ama', away: 'Kofi' }, versus: false };
  const lines = [1, 2, 3, 4, 5].map((goalNumber) => ordinaryGoalDetail({ ...base, goalNumber }));
  assert.equal(new Set(lines.slice(0, 4)).size, 4);
  assert.equal(lines[4], lines[0]);
  assert.equal(ordinaryGoalDetail({ ...base, scorer: 'away', goalNumber: 2 }), 'Esi found the gap.');
  assert.equal(ordinaryGoalDetail({ ...base, scorer: 'away', versus: true, goalNumber: 2 }), 'Kofi takes the goal.');
});

test('all existing venues and acts retain concise, distinct story copy', () => {
  assert.equal(CAMPAIGN_LEVELS.length, 6);
  assert.equal(STREET_LEGENDS_ACTS.length, 18);
  for (const level of [...CAMPAIGN_LEVELS, ...STREET_LEGENDS_ACTS]) {
    assert.ok(level.blurb.length > 15 && level.blurb.length < 120, level.id);
  }
  assert.equal(new Set(STREET_LEGENDS_ACTS.map((level) => level.blurb)).size, 18);
});

test('conditions name each Street Legends table by its moving feature, and count obstacles in good English', async () => {
  const { tableConditionCopy, TABLE_FEATURE_COPY } = await import('../src/ui/konk-interface-copy.js');
  const { STREET_LEGENDS_ACTS } = await import('../src/levels/street-legends-acts-and-unlocks.js');
  assert.equal(conditionObstacleCopy(1), '1 fixed obstacle');
  for (const act of STREET_LEGENDS_ACTS) {
    const line = tableConditionCopy(act);
    assert.ok(line.startsWith(TABLE_FEATURE_COPY[act.mechanic.type]), `${act.id}: ${line}`);
    assert.doesNotMatch(line, /No fixed obstacles/, act.id);
  }
  const roadsideFinal = STREET_LEGENDS_ACTS.find((act) => act.id === 'legends-roadside-act-3');
  assert.equal(tableConditionCopy(roadsideFinal), 'Toll booms open and close · 1 fixed obstacle');
  assert.equal(tableConditionCopy({ obstacles: [] }), MENU_COPY.noObstacles);
});
