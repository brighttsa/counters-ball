import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE, FlickPhysicsEngine } from './helpers/real-three-session-fixture.mjs';
const { pathClear, findRailBank, hiddenFromCamera, attackedGoal } = await import('../src/gameplay/chalk-hint-shot-geometry.js');
const { WALL_HALF_WIDTH, BALL_RADIUS } = await import('../src/core/pitch-dimensions-and-constants.js');

// Home attacks +x. The ball sits in the middle, an away cap parks on the straight line to goal.
function table({ blocker = true } = {}) {
  const physics = new FlickPhysicsEngine();
  const ball = physics.addBody({ x: 0, z: 0, radius: BALL_RADIUS, mass: .12, kind: 'ball' });
  if (blocker) physics.addBody({ x: .8, z: 0, radius: .085, mass: 1, kind: 'cap', side: 'away' });
  return { physics, ball };
}

test('no bank hint when the straight line to goal is open', () => {
  const { physics, ball } = table({ blocker: false });
  assert.ok(pathClear(ball.pos, attackedGoal(physics, 'home'), physics));
  assert.equal(findRailBank(physics, ball.pos, 'home'), null);
});

test('a blocked straight line finds a clean one-rail bank that ends in the goal mouth', () => {
  const { physics, ball } = table();
  const bank = findRailBank(physics, ball.pos, 'home');
  assert.ok(bank, 'a bank exists');
  assert.ok(Math.abs(Math.abs(bank.bank.y) - (WALL_HALF_WIDTH - BALL_RADIUS)) < 1e-9, 'the bank point is on a side rail');
  assert.deepEqual(bank.goal, attackedGoal(physics, 'home'));
  // Angle in equals angle out: mirror geometry, so both legs make the same angle with the rail.
  const inAngle = Math.atan2(Math.abs(bank.bank.y - bank.ball.y), bank.bank.x - bank.ball.x);
  const outAngle = Math.atan2(Math.abs(bank.goal.y - bank.bank.y), bank.goal.x - bank.bank.x);
  assert.ok(Math.abs(inAngle - outAngle) < 1e-9);
  assert.ok(pathClear(bank.ball, bank.bank, physics) && pathClear(bank.bank, bank.goal, physics));
});

test('no bank when both banks are blocked too, and the away side banks toward its own goal', () => {
  const { physics, ball } = table();
  for (const z of [-.55, .55]) physics.addStaticCircle({ x: .4, z, radius: .12, kind: 'pot' });
  assert.equal(findRailBank(physics, ball.pos, 'home'), null);
  const away = table({ blocker: false });
  away.physics.addBody({ x: -.8, z: 0, radius: .085, mass: 1, kind: 'cap', side: 'home' });
  assert.ok(findRailBank(away.physics, away.ball.pos, 'away').goal.x < 0);
});

test('a standing segment (the ruler) blocks a path; a lifted one (open boom) does not', () => {
  const { physics, ball } = table({ blocker: false });
  const ruler = physics.addStaticSegment({ ax: .7, az: -.3, bx: .7, bz: .3, radius: .01, kind: 'ruler' });
  assert.ok(!pathClear(ball.pos, attackedGoal(physics, 'home'), physics));
  ruler.disabled = true;
  assert.ok(pathClear(ball.pos, attackedGoal(physics, 'home'), physics));
});

test('a cap is hidden when another piece stands between it and a low camera, not from overhead', () => {
  const physics = new FlickPhysicsEngine();
  const mine = physics.addBody({ x: 0, z: 0, radius: .085, mass: 1, kind: 'cap', side: 'home' });
  physics.addBody({ x: -.4, z: 0, radius: .085, mass: 1, kind: 'cap', side: 'away' });
  assert.ok(hiddenFromCamera({ x: -2.5, y: .15, z: 0 }, mine, physics), 'low camera behind the other cap');
  assert.ok(!hiddenFromCamera({ x: 0, y: 4, z: .3 }, mine, physics), 'overhead view sees it');
  assert.ok(!hiddenFromCamera({ x: 2.5, y: .15, z: 0 }, mine, physics), 'the other cap is behind it from this side');
});
