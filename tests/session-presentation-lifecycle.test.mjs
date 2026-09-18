import test from 'node:test';
import assert from 'node:assert/strict';

const runtime = process.env.COUNTERS_TEST_THREE
  ? await import('./helpers/real-three-session-fixture.mjs') : null;
const options = { skip: runtime ? false : 'Set COUNTERS_TEST_THREE to the actual Three r160 module path.' };

test('fixed-step observer sees resolved walls and is absent from AI clones', options, () => {
  const { FlickPhysicsEngine, FIXED_STEP } = runtime;
  const physics = new FlickPhysicsEngine();
  const body = physics.addBody({ x: 0, z: 1.09, radius: 0.08, mass: 1, kind: 'cap' });
  body.vel.set(0, 1);
  const events = [];
  physics.onWallHit = () => events.push('wall');
  physics.onStep = dt => {
    assert.equal(dt, FIXED_STEP);
    assert.ok(body.vel.y < 0);
    events.push('step');
  };
  physics.advance(FIXED_STEP);
  assert.deepEqual(events, ['wall', 'step']);
  const clone = physics.cloneForSimulation();
  assert.equal(clone.onStep, null);
  clone.advance(FIXED_STEP);
  assert.deepEqual(events, ['wall', 'step']);
});

test('skill age advances only in moving physics steps, never render updates or hit-stop', options, () => {
  const { s } = runtime.fixture();
  s.flick(s.entries[0], new runtime.THREE.Vector2(1, 0));
  const shot = s.presentation.skills.shot;
  s.presentation.update(1);
  assert.equal(shot.age, 0);
  s.time.hitStop(0.1);
  s.update(0.02, 0.02);
  assert.equal(shot.age, 0);
  s.time.reset();
  s.update(runtime.FIXED_STEP * 2, 0.03);
  assert.ok(Math.abs(shot.age - runtime.FIXED_STEP * 2) < 1e-12);
  s.rules.registerGoal(1);
  const age = shot.age;
  s.physics.advance(runtime.FIXED_STEP);
  assert.equal(shot.age, age);
});

test('goal frame is captured after mesh synchronization and juice, exactly once', options, () => {
  const { s } = runtime.fixture();
  s.flick(s.entries[0], new runtime.THREE.Vector2(1, 0));
  s.ballBody.pos.set(1, 0.1);
  s.stage.ballMesh.position.x = -99;
  s.juice.update = () => { s.stage.ballMesh.scale.set(2, 3, 4); };
  const before = s.presentation.replay.count;
  s.rules.registerGoal(1);
  assert.equal(s.presentation.replay.count, before);
  s.update(0, 0);
  const replay = s.presentation.replay;
  assert.equal(replay.count, before + 1);
  const offset = ((replay.head - 1 + replay.capacity) % replay.capacity) * replay.stride + 20;
  assert.equal(replay.data[offset], 1);
  assert.deepEqual(Array.from(replay.data.slice(offset + 7, offset + 10)), [2, 3, 4]);
  s.update(0, 0);
  assert.equal(replay.count, before + 1);
});

for (const completion of ['skip', 'finish']) {
  test(`replay ${completion} restores before one kickoff and does not rescore`, options, () => {
    const { s } = runtime.fixture();
    runtime.prepareHighlight(s);
    const live = s.stage.ballMesh.position.clone();
    let kickoffs = 0;
    s.rules.on('kickoff', () => {
      kickoffs++;
      assert.ok(s.stage.ballMesh.position.distanceTo(live) < 1e-6);
    });
    s.update(2.6, 2.6);
    assert.equal(s.presentation.replay.active, true);
    const snapshot = s.physics.snapshot();
    s.update(0.4, 3);
    assert.deepEqual(s.physics.snapshot(), snapshot);
    assert.equal(s.rules.phase, 'goal');
    s.setPaused(true);
    const elapsed = s.presentation.replay.elapsed;
    s.update(1, 4);
    assert.equal(s.presentation.replay.elapsed, elapsed);
    s.setPaused(false);
    if (completion === 'skip') s.presentation.finishReplay();
    else s.update(s.presentation.replay.duration, 6);
    s.presentation.finishReplay();
    assert.equal(kickoffs, 1);
    assert.deepEqual(s.rules.scores, { home: 1, away: 0 });
    assert.equal(s.rules.phase, 'aiming');
  });
}

for (const config of [{ isAttract: true }, { motionEnabled: false }]) {
  test(`replay excluded for ${JSON.stringify(config)} still advances goal`, options, () => {
    const { s } = runtime.fixture(config);
    runtime.prepareHighlight(s);
    s.update(2.6, 2.6);
    assert.equal(s.presentation.replay.active, false);
    assert.equal(s.rules.phase, 'aiming');
  });
}

test('winning replay delays results; disposal restores transforms and cancels pending result', options, () => {
  const { s, calls } = runtime.fixture({ goalsToWin: 1 });
  runtime.prepareHighlight(s);
  s.update(2.6, 2.6);
  const live = s.stage.ballMesh.position.clone();
  s.update(0.2, 2.8);
  assert.equal(s.rules.result, null);
  s.dispose();
  assert.ok(s.stage.ballMesh.position.distanceTo(live) < 1e-6);
  assert.equal(s.presentation.replay.active, false);
  assert.deepEqual(s.timers, []);
  s.update(100, 100);
  assert.equal(calls.filter(([name]) => name === 'result').length, 0);
});

test('paused replay skip restores presentation but continues rules once only after resume', options, () => {
  const { s, calls } = runtime.fixture();
  runtime.prepareHighlight(s);
  s.update(2.6, 2.6);
  const live = s.stage.ballMesh.position.clone();
  s.update(0.2, 2.8);
  let continuations = 0;
  const finish = s.rules.finishGoalCelebration.bind(s.rules);
  s.rules.finishGoalCelebration = () => { continuations++; finish(); };
  s.setPaused(true);
  s.presentation.finishReplay();
  s.presentation.finishReplay();
  assert.ok(s.stage.ballMesh.position.distanceTo(live) < 1e-6);
  assert.equal(s.presentation.replay.active, false);
  assert.equal(continuations, 0);
  assert.equal(s.rules.phase, 'goal');
  for (const name of ['particles.setVisible', 'hud.replay', 'camera.setReplay']) {
    const last = calls.filter(([key]) => key === name).at(-1);
    assert.equal(last[1], name === 'particles.setVisible');
  }
  s.presentation.update(1);
  assert.equal(continuations, 0);
  s.setPaused(false);
  s.update(0, 3);
  s.update(0, 3);
  assert.equal(continuations, 1);
  assert.equal(s.rules.phase, 'aiming');
});
