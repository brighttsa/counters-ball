import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE, FlickPhysicsEngine } from './helpers/real-three-session-fixture.mjs';
const { PRACTICE_LESSONS, applyPracticeSetup } = await import('../src/gameplay/kwame-corner-practice-lesson-steps.js');
const { KWAME_CORNER_TABLE } = await import('../src/levels/kwame-corner-practice-table.js');
const { trackFor, isTrackLevelUnlocked } = await import('../src/levels/level-tracks-and-challenge-unlocks.js');
const { findRailBank } = await import('../src/gameplay/chalk-hint-shot-geometry.js');
const { TEAM_FORMATION } = await import('../src/core/pitch-dimensions-and-constants.js');

// A practice table as the session builds it: five home caps in formation and the away keeper.
function practiceSession() {
  const physics = new FlickPhysicsEngine();
  const entries = [
    ...TEAM_FORMATION.map(([x, z]) => ({ side: 'home', home: [x, z], body: physics.addBody({ x, z, radius: .085, mass: 1, kind: 'cap', side: 'home' }) })),
    { side: 'away', home: [1.32, 0], body: physics.addBody({ x: 1.32, z: 0, radius: .085, mass: 1, kind: 'cap', side: 'away' }) },
  ];
  const ballBody = physics.addBody({ x: 0, z: 0, radius: .035, mass: .12, kind: 'ball' });
  for (const [x, z] of [[1.5, -.26], [1.5, .26]]) physics.addStaticCircle({ x, z, radius: .02, kind: 'post' });
  return { physics, entries, ballBody, input: { selected: null } };
}

test("Kwame's Corner is its own one-table track, always open, solo and without a score to chase", () => {
  assert.deepEqual(trackFor('practice'), [KWAME_CORNER_TABLE]);
  assert.ok(isTrackLevelUnlocked({ stars: {} }, 'practice', 0));
  assert.equal(KWAME_CORNER_TABLE.rules.awayFlickLimit, 0, 'the keeper never flicks');
  assert.deepEqual(KWAME_CORNER_TABLE.awaySlots, [0]);
  assert.ok(KWAME_CORNER_TABLE.practice);
});

test('each lesson lays the table out, and only the bank lesson demands a rail touch', () => {
  const s = practiceSession();
  const bank = PRACTICE_LESSONS.find(l => l.id === 'bank');
  applyPracticeSetup(s, bank.setup);
  assert.deepEqual([s.ballBody.pos.x, s.ballBody.pos.y], bank.setup.ball);
  assert.deepEqual([s.entries[3].body.pos.x, s.entries[3].body.pos.y], bank.setup.home[3]);
  assert.deepEqual([s.entries[5].body.pos.x, s.entries[5].body.pos.y], bank.setup.away[0]);
  assert.deepEqual(s.physics.goalRequiresTouchOf, ['rail']);
  assert.ok(findRailBank(s.physics, s.ballBody.pos, 'home'), 'the straight line is blocked and a clean bank exists');
  applyPracticeSetup(s, PRACTICE_LESSONS.find(l => l.id === 'ring').setup);
  assert.equal(s.physics.goalRequiresTouchOf, null);
  assert.deepEqual([s.entries[3].body.pos.x, s.entries[3].body.pos.y], TEAM_FORMATION[3], 'unnamed caps go home');
});

test('each lesson completes on the thing it teaches', () => {
  const s = practiceSession();
  const lesson = id => PRACTICE_LESSONS.find(l => l.id === id);
  const attempt = { ballMoved: false, restedInRing: false, scored: false };
  const control = { peeking: false, mode: 'broadcast' };
  const done = id => lesson(id).done({ session: s, control, attempt });
  assert.ok(!done('pick')); s.input.selected = s.entries[0]; assert.ok(done('pick'));
  assert.ok(!done('flick')); attempt.ballMoved = true; assert.ok(done('flick'));
  assert.ok(!done('ring')); attempt.restedInRing = true; assert.ok(done('ring'));
  assert.ok(!done('bank')); attempt.scored = true; assert.ok(done('bank'));
  assert.ok(!done('peek')); control.peeking = true; assert.ok(done('peek'));
  assert.ok(!done('street')); control.mode = 'street'; assert.ok(done('street'));
  assert.deepEqual(PRACTICE_LESSONS.map(l => l.id), ['pick', 'flick', 'ring', 'bank', 'peek', 'street']);
});

test('finishing practice is remembered in the save', async () => {
  const { loadProgress } = await import('../src/core/save-progress-local-storage.js');
  const previous = globalThis.window;
  try {
    globalThis.window = { localStorage: { getItem: () => JSON.stringify({ stars: {}, practiceDone: true }) } };
    assert.equal(loadProgress().practiceDone, true);
    globalThis.window = { localStorage: { getItem: () => JSON.stringify({ stars: {}, practiceDone: 'yes' }) } };
    assert.equal(loadProgress().practiceDone, undefined);
  } finally { globalThis.window = previous; }
});
