import test from 'node:test';
import assert from 'node:assert/strict';
import { ClayPotMaze } from '../src/gameplay/clay-pot-maze-state.js';
import { potCandidatePoints } from '../src/gameplay/clay-pot-maze-ai-evaluation.js';

const needsThree = { skip: !process.env.COUNTERS_TEST_THREE };
const setup = async () => {
  const { FlickPhysicsEngine } = await import('./helpers/real-three-session-fixture.mjs');
  const physics = new FlickPhysicsEngine();
  const ball = physics.addBody({ x: 0, z: 0, radius: 0.035, mass: 0.12, kind: 'ball' });
  const maze = new ClayPotMaze();
  maze.attach(physics);
  return { physics, ball, maze };
};
const shoot = (physics, ball, from, dir, speed = 2.6) => {
  ball.pos.set(...from); ball.prev.copy(ball.pos);
  const l = Math.hypot(...dir);
  ball.vel.set((dir[0] / l) * speed, (dir[1] / l) * speed);
  physics.resetGoalCooldown();
  const out = { goal: 0, denied: 0 };
  physics.onGoalScored = (sign) => { out.goal = sign; };
  physics.onGoalDenied = (sign) => { out.denied = sign; };
  for (let i = 0; i < 600 && !out.goal; i++) physics.stepFixed(1 / 240);
  return out;
};

test('six pots, point-symmetric, and the bank rule switched on', async () => {
  const maze = new ClayPotMaze();
  const added = [];
  maze.attach({ addStaticCircle: (spec) => { const b = { ...spec, pos: { x: spec.x, y: spec.z } }; added.push(b); return b; } });
  assert.equal(added.length, 6);
  for (const pot of added) assert.ok(added.some((o) => Math.abs(o.x + pot.x) < 1e-9 && Math.abs(o.z + pot.z) < 1e-9));
  assert.equal(maze.potsFacing('home').length, 3);
  assert.ok(maze.potsFacing('home').every((p) => p.pos.x > 0));
});

test('a straight goal is waved off; a goal off a pot counts; clones carry the rule', needsThree, async () => {
  const { physics, ball } = await setup();
  const straight = shoot(physics, ball, [1.28, 0.17], [1, 0]);
  assert.deepEqual(straight, { goal: 0, denied: 1 });
  const clone = physics.cloneForSimulation();
  assert.deepEqual(clone.goalRequiresTouchOf, ['pot', 'rail']);
  // A bounce off the side rail counts too.
  const rail = shoot(physics, ball, [0.9, 0.9], [0.35, 0.6]);
  physics.clearBankTouches();
  assert.notEqual(rail.denied, 1, 'a rail bank is never waved off');
  // Search for a real bank off the right-hand pot, then confirm it counts.
  let found = null;
  for (let deg = -80; deg <= 80 && !found; deg += 1) {
    const sim = physics.cloneForSimulation();
    const b = sim.bodies[0]; b.pos.set(0.72, 0.36); b.prev.copy(b.pos);
    const r = (deg * Math.PI) / 180; b.vel.set(Math.cos(r) * 2.6, Math.sin(r) * 2.6);
    if (sim.simulateUntilRest(3) === 1) found = deg;
  }
  assert.notEqual(found, null, 'a bank goal exists from the Act 1 start');
  physics.clearBankTouches();
  const r = (found * Math.PI) / 180;
  const banked = shoot(physics, ball, [0.72, 0.36], [Math.cos(r), Math.sin(r)]);
  assert.equal(banked.goal, 1);
  assert.equal(ball.bankedOff, true);
});

test('a ball resting against a pot is not a bank; touches reset each flick and rehearsal', needsThree, async () => {
  const { physics: p2, ball: b2 } = await setup();
  const { POT_RADIUS } = await import('../src/gameplay/clay-pot-maze-state.js');
  b2.pos.set(1.1 - POT_RADIUS - b2.radius - 0.001, 0); b2.prev.copy(b2.pos); // just touching the big pot, at rest
  for (let i = 0; i < 10; i++) p2.stepFixed(1 / 240);
  assert.notEqual(b2.bankedOff, true, 'resting contact does not count');

  const { physics, ball } = await setup();
  ball.bankedOff = true;
  physics.clearBankTouches();
  assert.equal(ball.bankedOff, false);
  ball.bankedOff = true;
  physics.restore(physics.snapshot());
  assert.equal(ball.bankedOff, false);
});

test('a ball left in the net is thrown back at the start of the next turn', () => {
  const maze = new ClayPotMaze();
  const ball = { kind: 'ball', pos: { x: 1.56, y: 0.05, set(x, y) { this.x = x; this.y = y; } },
    prev: { copy(p) { this.x = p.x; this.y = p.y; } } };
  assert.deepEqual(maze.advance('home', [ball]), ['AUNTIE AMA THROWS IT BACK']);
  assert.ok(ball.pos.x < 1.5 && ball.pos.x > 1.0);
  assert.deepEqual(maze.advance('away', [ball]), [], 'nothing to throw back now');
});

test('labels: OFF THE POT for one pot (own goals too), DOUBLE POT for two, OFF THE RAIL otherwise', () => {
  const maze = new ClayPotMaze();
  const potA = { kind: 'pot' }, potB = { kind: 'pot' }, ball = { kind: 'ball' };
  maze.beginFlick('home');
  assert.equal(maze.goalLabel('home'), 'OFF THE RAIL');
  maze.noteImpact(potA, ball);
  maze.noteImpact(ball, potA);
  assert.equal(maze.goalLabel('home'), 'OFF THE POT');
  maze.noteImpact(potB, ball);
  assert.equal(maze.goalLabel('home'), 'DOUBLE POT');
  maze.beginFlick('away');
  maze.noteImpact(potA, ball);
  assert.equal(maze.goalLabel('home'), 'OFF THE POT', 'an own goal off a pot still counts as a bank');
});

test('AI plans a banked goal that counts (pot or rail), with ghost-ball aims onto the pots', needsThree, async () => {
  const { physics, ball, maze } = await setup();
  const { planAiShot, AI_DIFFICULTY } = await import('../src/gameplay/ai-opponent-shot-planner.js');
  const { createSeededRandom } = await import('../src/core/seeded-random-number-generator.js');
  ball.pos.set(0.85, 0.2);
  const cap = physics.addBody({ x: 0.6, z: 0.22, radius: 0.085, mass: 1, kind: 'cap', side: 'home' });
  assert.equal(potCandidatePoints(maze, 'home', ball.pos).ballTargets.length, 3);
  const mechanic = { aiCandidates: (side) => potCandidatePoints(maze, side, ball.pos), aiScore: () => 0 };
  const plan = await planAiShot({ physics, side: 'home', capBodies: [cap], ballBody: ball,
    difficulty: { ...AI_DIFFICULTY.champion, aimNoise: 0, powerNoise: 0, randomSamples: 30 }, rng: createSeededRandom(9),
    yieldToFrame: async () => {}, isCancelled: () => false, mechanic });
  const sim = physics.cloneForSimulation();
  sim.bodies[physics.bodies.indexOf(cap)].vel.copy(plan.velocity);
  assert.equal(sim.simulateUntilRest(3.5), 1, 'the planned shot scores, so it banked');
  assert.equal(sim.bodies[physics.bodies.indexOf(ball)].bankedOff, true);
});
