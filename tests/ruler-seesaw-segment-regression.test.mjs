import test from 'node:test';
import assert from 'node:assert/strict';
import { RulerSeesaws, RULER_PIVOT_X, ANGLE_NAMES } from '../src/gameplay/ruler-seesaw-state.js';
import { lineBlockedBySegment, closestPointOnSegment } from '../src/gameplay/segment-geometry-helpers.js';
import { rulerCandidatePoints } from '../src/gameplay/ruler-seesaw-ai-evaluation.js';

const needsThree = { skip: !process.env.COUNTERS_TEST_THREE };
const fakePhysics = () => ({ segments: [], addStaticSegment(spec) { const s = { ...spec }; this.segments.push(s); return s; } });

test('segment geometry: closest point and line-of-sight', () => {
  const c = closestPointOnSegment(0, -1, 0, 1, 0.5, 0.2);
  assert.equal(c.x, 0);
  assert.ok(Math.abs(c.z - 0.2) < 1e-12);
  const wall = { ax: 0, az: -0.3, bx: 0, bz: 0.3, radius: 0.012 };
  assert.equal(lineBlockedBySegment(-1, 0, 1, 0, wall), true);
  assert.equal(lineBlockedBySegment(-1, 0.5, 1, 0.5, wall), false);
});

test('each ruler turns 45° per attacker turn, same way round, and the table stays symmetric', () => {
  const rulers = new RulerSeesaws();
  rulers.attach(fakePhysics());
  const home = rulers.rulerDefendedBy('home'), away = rulers.rulerDefendedBy('away');
  assert.deepEqual([rulers.angleIndex(home), rulers.angleIndex(away)], [0, 0], 'both start open');
  const seen = [];
  for (let i = 0; i < 8; i++) { rulers.advance('home', []); seen.push(rulers.angleIndex(away)); }
  assert.deepEqual(seen, [1, 2, 3, 0, 1, 2, 3, 0]);
  assert.equal(rulers.angleIndex(home), 0, 'the defender\'s own turn never turns its ruler');
  // Point symmetry: the away ruler at +45° mirrors the home ruler at +45° through the centre spot.
  rulers.advance('away', []);
  rulers.advance('home', []); rulers.advance('home', []); rulers.advance('home', []); rulers.advance('home', []);
  rulers.advance('home', []); // away ruler at index 1 again
  const a = away.segment, h = home.segment;
  assert.ok(Math.abs(a.ax + h.bx) < 1e-9 && Math.abs(a.az + h.bz) < 1e-9, 'mirror images');
  assert.equal(ANGLE_NAMES[rulers.angleIndex(away)], 'SLANTED');
});

test('the ruler sweeps resting caps and the ball aside and always turns', () => {
  const rulers = new RulerSeesaws();
  rulers.attach(fakePhysics());
  const away = rulers.rulerDefendedBy('away');
  const cap = { kind: 'cap', pos: { x: RULER_PIVOT_X + 0.18, y: 0.1 }, radius: 0.085 }; // in the 0°→45° sweep
  const ball = { kind: 'ball', pos: { x: RULER_PIVOT_X - 0.2, y: -0.05 }, prev: { x: 0, y: 0 }, radius: 0.035 };
  assert.deepEqual(rulers.advance('home', [cap, ball]), []);
  assert.equal(rulers.angleIndex(away), 1, 'turned despite both');
  const s = away.segment;
  for (const body of [cap, ball]) {
    const c = closestPointOnSegment(s.ax, s.az, s.bx, s.bz, body.pos.x, body.pos.y);
    assert.ok(Math.hypot(body.pos.x - c.x, body.pos.y - c.z) >= body.radius + 0.012 - 1e-9, `${body.kind} ends clear`);
  }
  assert.ok(cap.pos.y > 0.1, 'cap pushed the way that end turned');
  assert.ok(ball.pos.y < -0.05, 'ball pushed the way the other end turned');
});

test('RULER BANK only for the scorer whose ball touched a ruler', () => {
  const rulers = new RulerSeesaws();
  rulers.beginFlick('home');
  assert.equal(rulers.goalLabel('home'), '');
  rulers.noteImpact({ kind: 'ruler' }, { kind: 'cap' });
  assert.equal(rulers.goalLabel('home'), '');
  rulers.noteImpact({ kind: 'ruler' }, { kind: 'ball' });
  assert.equal(rulers.goalLabel('home'), 'RULER BANK');
  assert.equal(rulers.goalLabel('away'), '');
});

test('the ball bounces off the ruler segment; AI rehearsal clones it', needsThree, async () => {
  const { FlickPhysicsEngine } = await import('./helpers/real-three-session-fixture.mjs');
  const physics = new FlickPhysicsEngine();
  const ball = physics.addBody({ x: 0.3, z: 0, radius: 0.035, mass: 0.12, kind: 'ball' });
  const rulers = new RulerSeesaws();
  rulers.attach(physics);
  rulers.advance('home', []); rulers.advance('home', []); // away ruler ACROSS the approach
  const impacts = [];
  physics.onImpact = (a, b) => impacts.push([a.kind, b.kind]);
  ball.vel.set(2.5, 0);
  for (let i = 0; i < 240; i++) physics.stepFixed(1 / 240);
  assert.ok(ball.pos.x < RULER_PIVOT_X, 'the ruler across the lane sends it back');
  assert.ok(ball.vel.x <= 0);
  assert.deepEqual(impacts[0], ['ruler', 'ball']);
  const clone = physics.cloneForSimulation();
  assert.equal(clone.segments.length, 2);
  assert.notEqual(clone.segments[0], physics.segments[0], 'deep copy');
  assert.equal(clone.segments[1].ax, physics.segments[1].ax);
});

test('AI offers a mirrored-goal bank aim and plans a scoring shot past a slanted ruler', needsThree, async () => {
  const { FlickPhysicsEngine } = await import('./helpers/real-three-session-fixture.mjs');
  const { planAiShot, AI_DIFFICULTY } = await import('../src/gameplay/ai-opponent-shot-planner.js');
  const { createSeededRandom } = await import('../src/core/seeded-random-number-generator.js');
  const physics = new FlickPhysicsEngine();
  const ball = physics.addBody({ x: 0.3, z: 0.45, radius: 0.035, mass: 0.12, kind: 'ball' });
  const cap = physics.addBody({ x: 0.05, z: 0.45, radius: 0.085, mass: 1, kind: 'cap', side: 'home' });
  const rulers = new RulerSeesaws();
  rulers.attach(physics);
  rulers.advance('home', []);
  const targets = rulerCandidatePoints(rulers, 'home').ballTargets;
  assert.equal(targets.length, 1, 'one mirrored-goal bank aim');
  const mechanic = { aiCandidates: (side) => rulerCandidatePoints(rulers, side), aiScore: () => 0 };
  const plan = await planAiShot({ physics, side: 'home', capBodies: [cap], ballBody: ball,
    difficulty: { ...AI_DIFFICULTY.champion, aimNoise: 0, powerNoise: 0 }, rng: createSeededRandom(5),
    yieldToFrame: async () => {}, isCancelled: () => false, mechanic });
  const sim = physics.cloneForSimulation();
  sim.bodies[physics.bodies.indexOf(cap)].vel.copy(plan.velocity);
  assert.equal(sim.simulateUntilRest(3.5), 1, 'the planned shot scores');
});
