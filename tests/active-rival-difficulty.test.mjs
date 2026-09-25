import test from 'node:test';
import assert from 'node:assert/strict';
import { STREET_LEGENDS_ACTS } from '../src/levels/street-legends-acts-and-unlocks.js';
import { MatchRules } from '../src/gameplay/match-rules-turns-goals-and-results.js';
import { scoreShotAccess, supportPointBehindBall } from '../src/gameplay/ai-positional-shot-evaluation.js';

test('all 18 campaign acts hand play to a live rival and back', () => {
  assert.equal(STREET_LEGENDS_ACTS.length, 18);
  for (const level of STREET_LEGENDS_ACTS) {
    const rules = new MatchRules(level.rules, { home: 'human', away: 'ai' });
    rules.start();
    assert.ok(rules.registerFlick('home'), level.id);
    rules.resolvePlayAtRest();
    assert.equal(rules.turn, 'away', level.id);
    assert.ok(rules.isAi(rules.turn));
    assert.ok(rules.registerFlick('away'));
    rules.resolvePlayAtRest();
    assert.equal(rules.turn, 'home');
    assert.equal(rules.flicksLeft('home'), rules.flicksLeft('away'));
    assert.ok(!level.introLines.join(' ').includes('Solo challenge'));
  }
});

test('each venue ramps from a small rookie team to full-team matches and a two-goal showdown', () => {
  for (let i = 0; i < STREET_LEGENDS_ACTS.length; i += 3) {
    const [intro, master, final] = STREET_LEGENDS_ACTS.slice(i, i + 3);
    assert.equal(intro.opponent.difficulty, 'rookie');
    assert.deepEqual(intro.awaySlots, [0, 3, 4]);
    assert.equal(master.awaySlots, undefined);
    assert.equal(final.awaySlots, undefined);
    assert.equal(intro.rules.goalsToWin, 1);
    assert.equal(final.rules.goalsToWin, 2);
    assert.ok(intro.rules.flickLimit <= master.rules.flickLimit);
    assert.ok(master.rules.flickLimit <= final.rules.flickLimit);
  }
});

test('AI values reachable support behind the ball, mirrored for both sides', () => {
  const ball = { kind: 'ball', pos: { x: 0, y: 0 } };
  const cap = (x, side) => ({ kind: 'cap', side, pos: { x, y: 0 } });
  const value = (caps, side = 'home') => scoreShotAccess({ bodies: [ball, ...caps] }, side, 0);
  assert.ok(value([cap(-0.3, 'home')]) > value([cap(0.3, 'home')]));
  assert.equal(value([cap(-0.3, 'home')]), value([cap(0.3, 'away')], 'away'));
  assert.equal(value([cap(-0.3, 'home')]), value([cap(-0.3, 'home'), cap(-0.4, 'home')]));
  assert.ok(supportPointBehindBall(ball, 'home').x < 0);
  assert.ok(supportPointBehindBall(ball, 'away').x > 0);
  const edge = supportPointBehindBall({ pos: { x: -1.6, y: 1.1 } }, 'home');
  assert.ok(edge.x >= -1.5 && edge.z <= 1);
});

test('real planner takes a scoring chance, leaves the live table intact, and respects cancellation', async () => {
  const { FlickPhysicsEngine } = await import('./helpers/real-three-session-fixture.mjs');
  const { planAiShot, AI_DIFFICULTY } = await import('../src/gameplay/ai-opponent-shot-planner.js');
  const physics = new FlickPhysicsEngine();
  const cap = physics.addBody({ kind: 'cap', side: 'away', x: -0.6, z: 0, radius: 0.085, mass: 1 });
  const ball = physics.addBody({ kind: 'ball', x: -0.85, z: 0, radius: 0.035, mass: 0.12 });
  const initial = physics.snapshot();
  const options = { physics, side: 'away', capBodies: [cap], ballBody: ball,
    difficulty: { ...AI_DIFFICULTY.medium, aimNoise: 0, powerNoise: 0, blunder: 0 },
    rng: () => 0.5, yieldToFrame: async () => {}, isCancelled: () => false };
  const plan = await planAiShot(options);
  assert.deepEqual(physics.snapshot(), initial);
  assert.equal(plan.body, cap);
  cap.vel.copy(plan.velocity);
  assert.equal(physics.simulateUntilRest(), -1);
  physics.restore(initial);
  assert.equal(await planAiShot({ ...options, isCancelled: () => true }), null);
});
