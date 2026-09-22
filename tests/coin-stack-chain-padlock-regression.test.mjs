import test from 'node:test';
import assert from 'node:assert/strict';

const needsThree = { skip: !process.env.COUNTERS_TEST_THREE };
const setup = async () => {
  const { FlickPhysicsEngine } = await import('./helpers/real-three-session-fixture.mjs');
  const { CoinStackChains } = await import('../src/gameplay/coin-stack-chain-state.js');
  const physics = new FlickPhysicsEngine();
  const ball = physics.addBody({ x: 0, z: 0.8, radius: 0.035, mass: 0.12, kind: 'ball' });
  const chains = new CoinStackChains();
  chains.attach(physics);
  const callouts = [];
  // As the venue mechanic does: every real impact may light the flicker's beam stack.
  physics.onImpact = (a, b) => callouts.push(...chains.noteImpact(a, b));
  return { physics, ball, chains, callouts };
};
const run = (physics, body, from, to, speed = 1.6) => {
  body.pos.set(...from); body.prev.copy(body.pos);
  const dx = to[0] - from[0], dz = to[1] - from[1], l = Math.hypot(dx, dz);
  body.vel.set((dx / l) * speed, (dz / l) * speed);
  physics.resetGoalCooldown();
  let goal = 0;
  physics.onGoalScored = (sign) => { goal = sign; };
  for (let i = 0; i < 240 * 3 && !goal; i++) physics.stepFixed(1 / 240);
  body.vel.set(0, 0);
  return goal;
};

test('three stacks per side, point-symmetric, both goals padlocked', needsThree, async () => {
  const { chains } = await setup();
  for (const [i, s] of chains.stacks.home.entries()) {
    const o = chains.stacks.away[i];
    assert.ok(Math.abs(s.pos.x + o.pos.x) < 1e-9 && Math.abs(s.pos.y + o.pos.y) < 1e-9);
    assert.ok(s.pos.x > 0, 'home lights its chain in the half it attacks');
  }
  assert.equal(chains.bars.home.disabled, false);
  assert.equal(chains.bars.away.disabled, false);
  assert.equal(chains.nextStack('home'), chains.stacks.home[0]);
});

test('a padlocked goal stops the ball on the line', needsThree, async () => {
  const { physics, ball } = await setup();
  assert.equal(run(physics, ball, [1.2, 0], [1.6, 0], 2.4), 0);
  assert.ok(ball.pos.x < 1.5, 'the ball bounced off the bar');
});

test('only the beam stack lights, struck by the ball or your own cap on your flick', needsThree, async () => {
  const { physics, ball, chains, callouts } = await setup();
  const [s1, s2] = chains.stacks.home;
  const away = physics.addBody({ x: -0.5, z: -0.9, radius: 0.085, mass: 1, kind: 'cap', side: 'away' });
  const home = physics.addBody({ x: -0.5, z: -0.8, radius: 0.085, mass: 1, kind: 'cap', side: 'home' });
  chains.beginFlick('home');
  run(physics, ball, [s2.pos.x - 0.3, s2.pos.y], [s2.pos.x, s2.pos.y]);
  assert.equal(chains.lit.home, 0, 'out of beam order: nothing lights');
  chains.beginFlick('home');
  run(physics, away, [s1.pos.x - 0.3, s1.pos.y], [s1.pos.x, s1.pos.y]);
  assert.equal(chains.lit.home, 0, "the other side's cap can't light your stack");
  chains.beginFlick('home');
  run(physics, home, [s1.pos.x - 0.3, s1.pos.y + 0.02], [s1.pos.x, s1.pos.y]);
  assert.equal(chains.lit.home, 1);
  assert.deepEqual(callouts, ['STACK 1 OF 3']);
  assert.equal(chains.nextStack('home'), s2, 'the beam moves on');
});

test('the third stack drops the padlock; a goal relocks it from the next turn', needsThree, async () => {
  const { physics, ball, chains, callouts } = await setup();
  const s3 = chains.stacks.home[2];
  chains.lit.home = 2;
  chains.beginFlick('home');
  run(physics, ball, [s3.pos.x - 0.3, s3.pos.y], [s3.pos.x, s3.pos.y]);
  assert.deepEqual(callouts, ['LIGHTS ON']);
  assert.equal(chains.bars.home.disabled, true);
  assert.equal(chains.isOpen('home'), true);
  chains.beginFlick('home');
  assert.equal(run(physics, ball, [1.2, 0.05], [1.6, 0.05], 2.4), 1, 'the open goal counts');
  assert.equal(chains.goalLabel('home'), '', 'a plain finish on a later flick gets no venue label');
  chains.goalScored('home');
  assert.deepEqual(chains.advance(), ['LIGHTS OUT']);
  assert.equal(chains.lit.home, 0);
  assert.equal(chains.bars.home.disabled, false);
  assert.deepEqual(chains.advance(), [], 'relocking happens once');
});

test('LIGHTS ON: from the Act 1 start the last stack can be struck and scored on one flick', needsThree, async () => {
  const { physics, ball, chains } = await setup();
  const base = physics.snapshot();
  let found = null;
  for (let deg = -80; deg <= 80 && !found; deg += 1) {
    physics.restore(base);
    chains.lit.home = 2; chains.bars.home.disabled = false;
    chains.beginFlick('home');
    const r = (deg * Math.PI) / 180;
    if (run(physics, ball, [0.85, 0], [0.85 + Math.cos(r), Math.sin(r)], 2.2) === 1) found = chains.goalLabel('home');
  }
  assert.equal(found, 'LIGHTS ON');
});

test('AI plans a flick that lights the beam stack; clones carry the bars and fresh strike records', needsThree, async () => {
  const { physics, ball, chains } = await setup();
  const { planAiShot, AI_DIFFICULTY } = await import('../src/gameplay/ai-opponent-shot-planner.js');
  const { createSeededRandom } = await import('../src/core/seeded-random-number-generator.js');
  const { chainCandidatePoints, scoreChainOutcome } = await import('../src/gameplay/coin-stack-chain-ai-evaluation.js');
  const { targetStruckFor } = await import('../src/gameplay/goal-line-crossing-detection.js');
  const cap = physics.addBody({ x: 0, z: -0.2, radius: 0.085, mass: 1, kind: 'cap', side: 'home' });
  ball.pos.set(0.85, 0);
  chains.bars.away.disabled = true;
  chains.stacks.home[0].hitBall = true; // stale record from an earlier flick
  const mechanic = { aiCandidates: (s) => chainCandidatePoints(chains, s),
    aiScore: (sim, s, i) => scoreChainOutcome(sim, s, i, chains, undefined, { defend: false }) };
  const plan = await planAiShot({ physics, side: 'home', capBodies: [cap], ballBody: ball,
    difficulty: { ...AI_DIFFICULTY.champion, aimNoise: 0, powerNoise: 0, randomSamples: 20 }, rng: createSeededRandom(4),
    yieldToFrame: async () => {}, isCancelled: () => false, mechanic });
  const sim = physics.cloneForSimulation();
  assert.equal(sim.segments[1].disabled, true, 'an open padlock stays open in rehearsal');
  sim.restore(sim.snapshot());
  const s1 = sim.bodies[physics.bodies.indexOf(chains.stacks.home[0])];
  assert.equal(s1.hitBall, false, 'each rehearsal starts with no strikes');
  sim.bodies[physics.bodies.indexOf(cap)].vel.copy(plan.velocity);
  sim.simulateUntilRest(3.5);
  assert.equal(targetStruckFor(s1, 'home'), true, 'the planned flick strikes stack one');
});
