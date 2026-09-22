import test from 'node:test';
import assert from 'node:assert/strict';
import { DepartingLorryGoals, LORRY_STOPS } from '../src/gameplay/departing-lorry-goal-state.js';
import { lorryCandidatePoints } from '../src/gameplay/departing-lorry-ai-evaluation.js';
import { STREET_LEGENDS_ACTS, isLegendActUnlocked } from '../src/levels/street-legends-acts-and-unlocks.js';

const needsThree = { skip: !process.env.COUNTERS_TEST_THREE };
const setup = async () => {
  const { FlickPhysicsEngine } = await import('./helpers/real-three-session-fixture.mjs');
  const physics = new FlickPhysicsEngine();
  const ball = physics.addBody({ x: 0, z: 0, radius: 0.035, mass: 0.12, kind: 'ball' });
  for (const side of [-1, 1]) for (const z of [-0.26, 0.26]) physics.addStaticCircle({ x: side * 1.5, z, radius: 0.02, kind: 'post' });
  const lorries = new DepartingLorryGoals();
  lorries.attach(physics);
  return { physics, ball, lorries };
};

test('each lorry moves one stop per attacker turn, ping-ponging from the centre', () => {
  const lorries = new DepartingLorryGoals();
  const away = lorries.goalDefendedBy('away'), home = lorries.goalDefendedBy('home');
  assert.deepEqual([lorries.stopIndex(home), lorries.stopIndex(away)], [2, 2], 'both parked at the centre');
  const seen = { away: [], home: [] };
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? 'away' : 'home';
    lorries.advance(side);
    seen.away.push(lorries.stopIndex(away));
    seen.home.push(lorries.stopIndex(home));
  }
  const homeShots = seen.away.filter((_, i) => i % 2 === 0); // the away goal only moves on home turns
  assert.deepEqual(homeShots, [1, 0, 1, 2, 3, 4, 3, 2]); // away lorry pulls out of the centre to the left
  assert.deepEqual(seen.home.filter((_, i) => i % 2 === 1), [3, 4, 3, 2, 1, 0, 1, 2]); // home lorry pulls right
  for (const list of [seen.away, seen.home]) {
    for (let i = 1; i < list.length; i++) assert.ok(Math.abs(list[i] - list[i - 1]) <= 1, 'never skips a stop');
  }
  assert.notEqual(lorries.stopIndex(home, 1) - lorries.stopIndex(home), lorries.stopIndex(away, 1) - lorries.stopIndex(away));
});

test('goal mouth and posts follow the lorry; a shot at the old centre misses', needsThree, async () => {
  const { physics, ball, lorries } = await setup();
  lorries.advance('home'); lorries.advance('home'); // away goal: centre → left → far left
  const z = LORRY_STOPS[lorries.stopIndex(lorries.goalDefendedBy('away'))];
  assert.equal(physics.goalCenters[1], z);
  const posts = physics.bodies.filter((b) => b.kind === 'post' && b.pos.x > 0).map((b) => b.pos.y).sort((a, b) => a - b);
  assert.deepEqual(posts.map((p) => +p.toFixed(3)), [+(z - 0.26).toFixed(3), +(z + 0.26).toFixed(3)]);
  const shoot = (atZ) => {
    ball.pos.set(1.2, atZ); ball.prev.copy(ball.pos); ball.vel.set(2.5, 0); physics.resetGoalCooldown();
    let goal = 0; physics.onGoalScored = (sign) => { goal = sign; };
    for (let i = 0; i < 400 && !goal; i++) physics.stepFixed(1 / 240);
    return goal;
  };
  assert.equal(shoot(z), 1, 'scores into the lorry where it is');
  assert.equal(shoot(z - 0.5), 0, 'no goal where the lorry used to be');
  assert.deepEqual(physics.cloneForSimulation().goalCenters, physics.goalCenters, 'AI rehearsal sees the moved goal');
});

test('hero labels: LAST STOP at the far ends, CAUGHT THE LORRY off-centre', () => {
  const lorries = new DepartingLorryGoals();
  lorries.beginFlick('home');
  assert.equal(lorries.goalLabel('home'), '', 'centre goal is ordinary');
  lorries.advance('home'); // LEFT
  assert.equal(lorries.goalLabel('home'), 'CAUGHT THE LORRY');
  assert.equal(lorries.goalLabel('away'), '');
  assert.deepEqual(lorries.advance('home'), ['LAST STOP: IT TURNS BACK NEXT']); // FAR LEFT
  assert.equal(lorries.goalLabel('home'), 'LAST STOP!');
});

test('AI slides a keeper toward its goal\'s next stop, but not in solo play', () => {
  const lorries = new DepartingLorryGoals();
  lorries.advance('home');
  const { blockPoints } = lorryCandidatePoints(lorries, 'away');
  assert.equal(blockPoints[0].z, lorries.center(lorries.goalDefendedBy('away'), 1));
  assert.ok(blockPoints[0].x > 1.2 && blockPoints[0].x < 1.5, 'in front of the away goal line');
  assert.deepEqual(lorryCandidatePoints(lorries, 'away', { defend: false }).blockPoints, []);
});

test('AI aims at the moved goal mouth and scores against real physics', needsThree, async () => {
  const { physics, ball, lorries } = await setup();
  const { planAiShot, AI_DIFFICULTY } = await import('../src/gameplay/ai-opponent-shot-planner.js');
  const { createSeededRandom } = await import('../src/core/seeded-random-number-generator.js');
  lorries.advance('home'); lorries.advance('away'); // home goal pulls out to the RIGHT
  const z = physics.goalCenters[-1];
  assert.notEqual(z, 0);
  ball.pos.set(-1.0, z * 0.6);
  const cap = physics.addBody({ x: -0.7, z: z * 0.4, radius: 0.085, mass: 1, kind: 'cap', side: 'away' });
  const plan = await planAiShot({ physics, side: 'away', capBodies: [cap], ballBody: ball,
    difficulty: { ...AI_DIFFICULTY.champion, aimNoise: 0, powerNoise: 0 }, rng: createSeededRandom(3),
    yieldToFrame: async () => {}, isCancelled: () => false });
  const sim = physics.cloneForSimulation();
  sim.bodies[physics.bodies.indexOf(cap)].vel.copy(plan.velocity);
  assert.equal(sim.simulateUntilRest(3.5), -1);
});

test('Street Legends unlocks: every venue\'s first act is open, later acts need the previous win', () => {
  const progress = { stars: {} };
  const firsts = STREET_LEGENDS_ACTS.map((level, i) => [level, i]).filter(([level]) => level.legend.act === 1);
  assert.ok(firsts.length >= 2);
  for (const [, i] of firsts) assert.equal(isLegendActUnlocked(progress, STREET_LEGENDS_ACTS, i), true);
  const second = STREET_LEGENDS_ACTS.findIndex((level) => level.id === 'legends-harmattan-act-2');
  assert.equal(isLegendActUnlocked(progress, STREET_LEGENDS_ACTS, second), false);
  progress.stars['legends-harmattan-act-1'] = 1;
  assert.equal(isLegendActUnlocked(progress, STREET_LEGENDS_ACTS, second), true);
  for (const level of STREET_LEGENDS_ACTS) assert.ok(['schoolyard', 'kiosk', 'veranda', 'roadside', 'harmattan'].includes(level.backdrop), 'real venues only');
});
