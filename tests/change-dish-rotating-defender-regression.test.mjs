import test from 'node:test';
import assert from 'node:assert/strict';
import { ChangeDishes, COVER_ANGLES, DISH_RADIUS, OPEN_NAMES } from '../src/gameplay/change-dish-state.js';
import { dishCandidatePoints } from '../src/gameplay/change-dish-ai-evaluation.js';

const needsThree = { skip: !process.env.COUNTERS_TEST_THREE };
const fakePhysics = () => ({ segments: [], addStaticSegment(spec) { const s = { ...spec }; this.segments.push(s); return s; } });

test('dishes park covering the centre, then turn one notch per attacker turn in mirror image', () => {
  const dishes = new ChangeDishes();
  dishes.attach(fakePhysics());
  const home = dishes.dishDefendedBy('home'), away = dishes.dishDefendedBy('away');
  assert.deepEqual([dishes.state(home), dishes.state(away)], [1, 1], 'both cover the centre');
  const awaySeen = [], homeSeen = [];
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 'away' : 'home';
    dishes.advance(side, []);
    (side === 'home' ? awaySeen : homeSeen).push(dishes.state(side === 'home' ? away : home));
  }
  assert.deepEqual(awaySeen, [2, 1, 0, 1]);
  assert.deepEqual(homeSeen, [0, 1, 2, 1]);
  // Point symmetry: reflecting through the centre spot maps the away dish's first piece onto the home dish's last.
  dishes.advance('home', []); dishes.advance('away', []);
  const a = away.segments[0], h = home.segments[home.segments.length - 1];
  assert.ok(Math.abs(a.ax + h.bx) < 1e-9 && Math.abs(a.az + h.bz) < 1e-9);
  assert.equal(OPEN_NAMES[dishes.state(away, 1)], 'OPEN EDGES');
});

test('the covered arc sits on the rim in front of the goal', () => {
  const dishes = new ChangeDishes();
  dishes.attach(fakePhysics());
  const away = dishes.dishDefendedBy('away');
  for (const s of away.segments) {
    for (const [x, z] of [[s.ax, s.az], [s.bx, s.bz]]) {
      assert.ok(Math.abs(Math.hypot(x - 1.5, z) - DISH_RADIUS) < 1e-9);
      assert.ok(x <= 1.5 + 1e-9, 'on the pitch side of the goal line');
    }
  }
});

test('a resting ball in the dish\'s path is swept clear as it turns', () => {
  const dishes = new ChangeDishes();
  dishes.attach(fakePhysics());
  const away = dishes.dishDefendedBy('away');
  // Next notch covers the left side (z < 0): put the ball on that part of the rim.
  const a = dishes.worldAngle(away, COVER_ANGLES[2]);
  const ball = { kind: 'ball', radius: 0.035, pos: { x: 1.5 + Math.cos(a) * DISH_RADIUS, y: Math.sin(a) * DISH_RADIUS }, prev: { x: 0, y: 0 } };
  dishes.advance('home', [ball]);
  for (const s of away.segments) {
    const t = Math.max(0, Math.min(1, ((ball.pos.x - s.ax) * (s.bx - s.ax) + (ball.pos.y - s.az) * (s.bz - s.az))
      / ((s.bx - s.ax) ** 2 + (s.bz - s.az) ** 2)));
    const d = Math.hypot(ball.pos.x - (s.ax + (s.bx - s.ax) * t), ball.pos.y - (s.az + (s.bz - s.az) * t));
    assert.ok(d >= 0.035 + 0.012 - 1e-9, 'clear of every piece');
  }
});

test('hero labels: EXACT CHANGE through the edges, OFF THE DISH after a rattle', () => {
  const dishes = new ChangeDishes();
  dishes.attach(fakePhysics());
  dishes.beginFlick('home');
  assert.equal(dishes.goalLabel('home'), 'EXACT CHANGE', 'centre covered: only the edges were open');
  dishes.advance('home', []);
  assert.equal(dishes.goalLabel('home'), '');
  dishes.noteImpact({ kind: 'dish' }, { kind: 'ball' });
  assert.equal(dishes.goalLabel('home'), 'OFF THE DISH');
  assert.equal(dishes.goalLabel('away'), '');
});

test('open windows: shots through the gap score, shots into the dish do not; AI aims into the gap', needsThree, async () => {
  const { FlickPhysicsEngine } = await import('./helpers/real-three-session-fixture.mjs');
  const physics = new FlickPhysicsEngine();
  const ball = physics.addBody({ x: 0.9, z: 0, radius: 0.035, mass: 0.12, kind: 'ball' });
  for (const z of [-0.26, 0.26]) physics.addStaticCircle({ x: 1.5, z, radius: 0.02, kind: 'post' });
  const dishes = new ChangeDishes();
  dishes.attach(physics);
  dishes.advance('home', []); // away dish covers the left side (z < 0): OPEN RIGHT
  const shoot = (fromZ, toZ) => {
    ball.pos.set(0.9, fromZ); ball.prev.copy(ball.pos);
    const dx = 1.6 - 0.9, dz = toZ - fromZ, l = Math.hypot(dx, dz);
    ball.vel.set((dx / l) * 2.4, (dz / l) * 2.4); physics.resetGoalCooldown();
    let goal = 0; physics.onGoalScored = (sign) => { goal = sign; };
    for (let i = 0; i < 480 && !goal; i++) physics.stepFixed(1 / 240);
    return goal;
  };
  assert.equal(shoot(-0.45, -0.05), 0, 'into the covered side: blocked');
  assert.equal(shoot(0.45, 0.1), 1, 'through the open side: goal');
  const { ballTargets } = dishCandidatePoints(dishes, 'home');
  assert.equal(ballTargets.length, 1);
  assert.ok(ballTargets[0].z > 0, 'aims into the open (right, z > 0) window');
});
