import test from 'node:test';
import assert from 'node:assert/strict';
import { FlickPhysicsEngine, FIXED_STEP } from './helpers/real-three-session-fixture.mjs';
const { contactRestitution, CONTACT_RESTITUTION_SQUARE, CONTACT_RESTITUTION_GLANCE } = await import('../src/gameplay/flick-feel-contact-rail-and-settle-rules.js');
const { findRailBank } = await import('../src/gameplay/chalk-hint-shot-geometry.js');
const { PRACTICE_LESSONS, applyPracticeSetup } = await import('../src/gameplay/kwame-corner-practice-lesson-steps.js');
const { TEAM_FORMATION, MAX_FLICK_SPEED, WALL_HALF_WIDTH } = await import('../src/core/pitch-dimensions-and-constants.js');

const run = (physics, seconds = 4) => {
  let goal = 0;
  physics.onGoalScored = (sign) => { goal = sign; };
  for (let i = 0; i < seconds / FIXED_STEP && !goal; i++) {
    physics.stepFixed(FIXED_STEP);
    if (physics.allBodiesResting()) break;
  }
  return goal;
};
const posts = (physics) => { for (const [x, z] of [[1.5, -.26], [1.5, .26]]) physics.addStaticCircle({ x, z, radius: .02, kind: 'post' }); };

test('clean contact: a square hit bounces harder than a glancing one', () => {
  assert.equal(contactRestitution(1, 1), CONTACT_RESTITUTION_SQUARE);
  assert.ok(contactRestitution(.2, 1) < contactRestitution(.9, 1));
  assert.ok(contactRestitution(0, 1) === CONTACT_RESTITUTION_GLANCE);
  // On the table: the same cap strike, dead-centre versus a thin cut.
  const strike = (offset) => {
    const physics = new FlickPhysicsEngine();
    const cap = physics.addBody({ x: -.3, z: offset, radius: .085, mass: 1, kind: 'cap' });
    const ball = physics.addBody({ x: 0, z: 0, radius: .035, mass: .12, kind: 'ball' });
    cap.vel.set(2.5, 0);
    for (let i = 0; i < 300 && ball.vel.length() === 0; i++) physics.stepFixed(FIXED_STEP);
    return ball.vel.length();
  };
  assert.ok(strike(0) > 3.1, 'a centred strike pops the ball');
  assert.ok(strike(.108) < 1.2, 'a thin cut drifts off softer');
});

test('rail bite: a ball leaves the side rail within a few degrees of the angle it came in', () => {
  for (const degrees of [25, 45, 60]) {
    const physics = new FlickPhysicsEngine();
    const ball = physics.addBody({ x: 0, z: .9, radius: .035, mass: .12, kind: 'ball' });
    const a = degrees * Math.PI / 180; // from the rail's normal
    ball.vel.set(Math.sin(a) * 2, Math.cos(a) * 2);
    for (let i = 0; i < 200 && ball.vel.y > 0; i++) physics.stepFixed(FIXED_STEP);
    const out = Math.atan2(ball.vel.x, -ball.vel.y) * 180 / Math.PI;
    assert.ok(Math.abs(out - degrees) < 4, `${degrees}° in, ${out.toFixed(1)}° out`);
  }
});

test('the chalk bank line tells the truth: a ball sent along it goes in', () => {
  const physics = new FlickPhysicsEngine();
  const ball = physics.addBody({ x: .4, z: .5, radius: .035, mass: .12, kind: 'ball' });
  physics.addBody({ x: .95, z: .25, radius: .085, mass: 1, kind: 'cap', side: 'away' }); // blocks the straight line
  posts(physics);
  const bank = findRailBank(physics, ball.pos, 'home');
  assert.ok(bank, 'the straight line is blocked and a bank is drawn');
  assert.ok(Math.abs(bank.bank.y) > WALL_HALF_WIDTH - .1);
  const dx = bank.bank.x - ball.pos.x, dz = bank.bank.y - ball.pos.y, l = Math.hypot(dx, dz);
  ball.vel.set(dx / l * 3.2, dz / l * 3.2);
  assert.equal(run(physics), 1);
});

test("Kwame's bank lesson can be made: a straight, firm flick through the ball banks in", () => {
  const physics = new FlickPhysicsEngine();
  const entries = [
    ...TEAM_FORMATION.map(([x, z]) => ({ side: 'home', home: [x, z], body: physics.addBody({ x, z, radius: .085, mass: 1, kind: 'cap', side: 'home' }) })),
    { side: 'away', home: [1.32, 0], body: physics.addBody({ x: 1.32, z: 0, radius: .085, mass: 1, kind: 'cap', side: 'away' }) },
  ];
  const ballBody = physics.addBody({ x: 0, z: 0, radius: .035, mass: .12, kind: 'ball' });
  posts(physics);
  applyPracticeSetup({ physics, entries, ballBody }, PRACTICE_LESSONS.find(l => l.id === 'bank').setup);
  physics.clearBankTouches();
  const cap = entries[3].body;
  const dx = ballBody.pos.x - cap.pos.x, dz = ballBody.pos.y - cap.pos.y, l = Math.hypot(dx, dz);
  cap.vel.set(dx / l * MAX_FLICK_SPEED, dz / l * MAX_FLICK_SPEED);
  assert.equal(run(physics), 1);
});

test('quick settle: a slow piece stops within a fraction of a second instead of creeping', () => {
  const physics = new FlickPhysicsEngine();
  const ball = physics.addBody({ x: 0, z: 0, radius: .035, mass: .12, kind: 'ball' });
  ball.vel.set(.11, 0);
  let t = 0;
  while (!physics.allBodiesResting() && t < 2) { physics.stepFixed(FIXED_STEP); t += FIXED_STEP; }
  assert.ok(t < .16, `stopped after ${t.toFixed(3)} s`);
  assert.ok(ball.pos.x < .01, `crept ${ball.pos.x.toFixed(4)}`);
});
