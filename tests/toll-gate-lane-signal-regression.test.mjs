import test from 'node:test';
import assert from 'node:assert/strict';
import { TollGateLaneSignals, LANES, PLAZA_X } from '../src/gameplay/toll-gate-lane-signal-state.js';
import { tollGateCandidatePoints } from '../src/gameplay/toll-gate-ai-lane-evaluation.js';
import { MatchRules } from '../src/gameplay/match-rules-turns-goals-and-results.js';

const needsThree = { skip: !process.env.COUNTERS_TEST_THREE };
const setup = async () => {
  const { THREE, FlickPhysicsEngine } = await import('./helpers/real-three-session-fixture.mjs');
  const physics = new FlickPhysicsEngine();
  const gates = new TollGateLaneSignals();
  const ball = physics.addBody({ x: 0, z: 0, radius: 0.035, mass: 0.12, kind: 'ball' });
  gates.attach(physics);
  return { THREE, physics, gates, ball };
};
const openLanes = (gates, plaza) => [0, 1, 2].filter((lane) => gates.isOpen(plaza, lane));

test('one boom down per plaza, stepping left, centre, right, centre for each attacker', () => {
  const gates = new TollGateLaneSignals();
  const away = gates.plazaDefendedBy('away'); // attacked by home
  const home = gates.plazaDefendedBy('home'); // attacked by away
  const homeFaces = [], awayFaces = [];
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 'away' : 'home';
    gates.advance(side, []);
    assert.equal(openLanes(gates, away).length, 2);
    assert.equal(openLanes(gates, home).length, 2);
    (side === 'home' ? homeFaces : awayFaces).push(gates.closedLane(side === 'home' ? away : home));
  }
  assert.deepEqual(homeFaces.slice(0, 4).sort(), [0, 1, 1, 2]); // the full rhythm, not a two-lane loop
  assert.deepEqual(awayFaces.slice(0, 4).sort(), [0, 1, 1, 2]);
  assert.notDeepEqual(homeFaces, awayFaces); // the two ends are offset
});

test('amber: the lane open now that closes when that plaza\'s attacker next starts a turn', () => {
  const gates = new TollGateLaneSignals();
  const away = gates.plazaDefendedBy('away');
  gates.advance('home', []);
  const closing = gates.closedLane(away, 1);
  assert.equal(gates.isOpen(away, closing), true);
  gates.advance('away', []); // the defender's turn does not move its own signal
  assert.equal(gates.closedLane(away, 1), closing);
  gates.advance('home', []);
  assert.equal(gates.isOpen(away, closing), false);
  assert.deepEqual(gates.openNext(away), [0, 1, 2].filter((l) => l !== gates.closedLane(away, 1)));
});

test('a closed boom stops the ball and an open lane lets it through', needsThree, async () => {
  const { physics, gates, ball } = await setup();
  gates.advance('home', [ball]);
  const away = gates.plazaDefendedBy('away');
  const closed = gates.closedLane(away), open = (closed + 1) % 3;
  const run = (lane) => {
    ball.pos.set(0.3, LANES[lane].center); ball.prev.copy(ball.pos); ball.vel.set(2.2, 0);
    physics.resetGoalCooldown();
    let goal = 0; physics.onGoalScored = (sign) => { goal = sign; };
    for (let i = 0; i < 600 && !goal; i++) physics.stepFixed(1 / 240);
    return { goal, x: ball.pos.x };
  };
  assert.ok(run(closed).x < PLAZA_X, 'closed boom bounces the ball back');
  const through = run(open);
  assert.ok(through.goal === 1 || through.x > PLAZA_X, 'open lane lets the ball pass');
  const cap = physics.addBody({ x: 0.3, z: LANES[closed].center, radius: 0.085, mass: 1, kind: 'cap', side: 'home' });
  cap.vel.set(2.2, 0);
  for (let i = 0; i < 240; i++) physics.stepFixed(1 / 240);
  assert.ok(cap.pos.x > PLAZA_X, 'a low cap slides under a closed boom');
  const clone = physics.cloneForSimulation(); // AI rehearsal sees the same booms
  assert.deepEqual(clone.bodies.map((b) => Boolean(b.disabled)), physics.bodies.map((b) => Boolean(b.disabled)));
});

test('a ball resting under a boom jams it open until it moves; caps never jam', () => {
  const gates = new TollGateLaneSignals();
  const away = gates.plazaDefendedBy('away');
  gates.advance('home', []);
  const closing = gates.closedLane(away, 1);
  const ball = { kind: 'ball', pos: { x: PLAZA_X, y: LANES[closing].center }, radius: 0.035 };
  const cap = { kind: 'cap', pos: { x: PLAZA_X, y: LANES[closing].center }, radius: 0.085 };
  gates.advance('away', [cap]);
  assert.deepEqual(gates.advance('home', [cap]), [], 'a cap under the boom does not jam it');
  assert.equal(gates.isOpen(away, closing), false);
  const fresh = new TollGateLaneSignals();
  const freshAway = fresh.plazaDefendedBy('away');
  fresh.advance('home', []);
  fresh.advance('away', [ball]);
  const jams = fresh.advance('home', [ball]); // the boom would land on the ball
  assert.deepEqual(jams, [{ plaza: 'away', lane: closing }]);
  assert.equal(openLanes(fresh, freshAway).length, 3);
  ball.pos.x = 0; // moved away: the jam clears the next time the signal changes
  fresh.advance('away', [ball]);
  fresh.advance('home', [ball]);
  assert.equal(openLanes(fresh, freshAway).length, 2);
});

test('toll goals get their own hero labels', () => {
  const gates = new TollGateLaneSignals();
  gates.advance('home', []);
  const lane = (gates.closedLane(gates.plazaDefendedBy('away')) + 1) % 3;
  const ball = { prev: { x: PLAZA_X - 0.01 }, pos: { x: PLAZA_X + 0.01, y: LANES[lane].center } };
  gates.beginFlick('home');
  gates.observe(ball);
  assert.match(gates.goalLabel('home'), /^THROUGH THE (LEFT|CENTRE|RIGHT) TOLL$/);
  assert.equal(gates.goalLabel('away'), '');
  gates.noteImpact({ kind: 'ball' }, { kind: 'boom' });
  assert.equal(gates.goalLabel('home'), 'BOOM BANK');
  gates.plazaDefendedBy('away').jammed.add(lane);
  gates.observe(ball);
  assert.equal(gates.goalLabel('home'), 'JAMMED THE GATE');
});

test('solo acts: a zero away allowance hands every turn back to home', () => {
  const rules = new MatchRules({ goalsToWin: 1, flickLimit: 3, awayFlickLimit: 0, threeStarFlicks: 2 }, { home: 'human', away: 'ai' });
  const turns = [];
  rules.on('turn', (side) => turns.push(side));
  rules.start();
  for (let i = 0; i < 3; i++) { rules.registerFlick('home'); rules.resolvePlayAtRest(); }
  assert.deepEqual(turns, ['home', 'home', 'home']);
  assert.equal(rules.phase, 'ended');
  assert.equal(rules.flicksLeft('away'), 0);
});

test('AI candidates aim through open lanes and block the lane that opens for the opponent', () => {
  const gates = new TollGateLaneSignals();
  gates.advance('away', []);
  const { ballTargets, blockPoints } = tollGateCandidatePoints(gates, 'away', 0);
  const homePlaza = gates.plazaDefendedBy('home');
  assert.deepEqual(ballTargets.map((p) => p.z), openLanes(gates, homePlaza).map((l) => LANES[l].center));
  assert.ok(gates.openNext(gates.plazaDefendedBy('away')).some((l) => LANES[l].center === blockPoints[0].z));
  assert.ok(blockPoints[0].x < PLAZA_X, 'block sits on the attacker side of the boom line');
  assert.deepEqual(tollGateCandidatePoints(gates, 'away', 0, { defend: false }).blockPoints, [], 'no blocking in solo play');
});

test('AI plans a scoring shot through the open lane against real physics', needsThree, async () => {
  const { physics, gates, ball } = await setup();
  const { planAiShot, AI_DIFFICULTY } = await import('../src/gameplay/ai-opponent-shot-planner.js');
  const { scoreTollGateOutcome } = await import('../src/gameplay/toll-gate-ai-lane-evaluation.js');
  const { createSeededRandom } = await import('../src/core/seeded-random-number-generator.js');
  gates.advance('away', [ball]);
  const home = gates.plazaDefendedBy('home');
  const lane = LANES[[0, 1, 2].find((l) => gates.isOpen(home, l))];
  ball.pos.set(-0.35, lane.center);
  const cap = physics.addBody({ x: -0.1, z: lane.center, radius: 0.085, mass: 1, kind: 'cap', side: 'away' });
  const mechanic = { aiCandidates: (side) => tollGateCandidatePoints(gates, side),
    aiScore: (sim, side, i) => scoreTollGateOutcome(sim, side, i, gates) };
  const plan = await planAiShot({ physics, side: 'away', capBodies: [cap], ballBody: ball,
    difficulty: { ...AI_DIFFICULTY.champion, aimNoise: 0, powerNoise: 0 }, rng: createSeededRandom(7),
    yieldToFrame: async () => {}, isCancelled: () => false, mechanic });
  const sim = physics.cloneForSimulation();
  sim.bodies[physics.bodies.indexOf(cap)].vel.copy(plan.velocity);
  assert.equal(sim.simulateUntilRest(3.5), -1, 'the planned shot scores through the toll');
});
