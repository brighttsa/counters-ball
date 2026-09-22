import test from 'node:test';
import assert from 'node:assert/strict';

const enabled = Boolean(process.env.COUNTERS_TEST_THREE);
test('venue openings, goal colliders and gesture camera lifecycle', { skip: !enabled }, async t => {
  const { THREE } = await import('./helpers/real-three-session-fixture.mjs');
  const events = new EventTarget();
  globalThis.window = { matchMedia: () => ({ matches: false }),
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) };
  t.after(() => { delete globalThis.window; });
  const { CameraDirector } = await import('../src/fx/camera-director-attract-intro-play-goal.js');
  const { VENUE_OPENINGS } = await import('../src/fx/venue-establishing-camera-profiles.js');
  const { HumanDragAimInput } = await import('../src/gameplay/human-drag-aim-input.js');
  const { buildVenueGoals } = await import('../src/scene/venue-goal-construction.js');
  const { getVenueVisualProfile } = await import('../src/scene/venue-visual-profiles.js');
  const { venueSurfaceOutline, venueSurfaceGeometry } = await import('../src/scene/venue-playing-surface-outline.js');
  const camera = new THREE.PerspectiveCamera(42, 390 / 844, 0.01, 100);
  const director = new CameraDirector(camera, new THREE.Scene());
  director.setMode('play'); director.update(1 / 60, 0); camera.updateMatrixWorld();
  await t.test('pose and FOV stay fixed while aiming, then tracking resumes', () => {
    director.setAimLocked(true);
    const before = [...camera.position, ...camera.quaternion, camera.fov];
    director.setFocus(1, 1); director.kick(1, 1, 0.5); director.setTension(1);
    for (let i = 0; i < 120; i++) director.update(1 / 60, i / 60);
    assert.deepEqual([...camera.position, ...camera.quaternion, camera.fov], before);
    director.setAimLocked(false); director.update(1 / 60, 2);
    assert.notDeepEqual([...camera.position, ...camera.quaternion, camera.fov], before);
  });
  await t.test('six different openings settle into play and respect motion off', () => {
    assert.equal(new Set(Object.values(VENUE_OPENINGS).map(v => JSON.stringify(v.position))).size, 6);
    for (const key of Object.keys(VENUE_OPENINGS)) {
      director.setVenue(key); director.playIntro(2.8);
      for (let i = 0; i < 170; i++) director.update(1 / 60, i / 60);
      assert.equal(director.mode, 'play');
      assert.ok(Number.isFinite(camera.position.length()));
    }
    director.setMotion(false); director.setMode('play'); director.update(1, 0);
    const before = camera.position.clone();
    director.playIntro(2.8); director.update(1 / 60, 0);
    assert.ok(camera.position.distanceTo(before) < 1e-10);
  });
  await t.test('all goal constructions retain the same four post colliders', () => {
    let expected;
    const names = new Set();
    for (const key of Object.keys(VENUE_OPENINGS)) {
      const result = buildVenueGoals(new THREE.Group(), getVenueVisualProfile(key));
      expected ??= result.postBodies;
      assert.deepEqual(result.postBodies, expected);
      assert.equal(result.postBodies.length, 4);
      names.add(result.goals[1].name);
    }
    assert.equal(names.size, 6);
  });
  await t.test('six surface outlines preserve playable extents and finite geometry', () => {
    const outlines = new Set();
    for (const key of Object.keys(VENUE_OPENINGS)) {
      const profile = getVenueVisualProfile(key), points = venueSurfaceOutline(profile.construction);
      outlines.add(JSON.stringify(points));
      for (const [x, z] of points) assert.ok(Math.abs(x) > 1.62 || Math.abs(z) > 1.12);
      for (const depth of [0, profile.depth]) {
        const geometry = venueSurfaceGeometry(profile.construction, depth);
        assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
        geometry.computeBoundingBox();
        assert.ok(geometry.boundingBox.max.y < 0.00001);
        geometry.dispose();
      }
    }
    assert.equal(outlines.size, 6);
  });
  await t.test('release and cancellation unlock; second pointer cannot take control', () => {
    const canvas = new EventTarget();
    Object.assign(canvas, { classList: { add() {}, remove() {}, toggle() {} },
      setPointerCapture() {}, hasPointerCapture: () => false,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }) });
    let shots = 0;
    const input = new HumanDragAimInput({ camera, domElement: canvas,
      visuals: { show() {}, hide() {}, hover() {} }, juice: { release() {}, press() {} },
      canControl: () => true, onFlick: () => shots++,
      onAimStart: () => director.setAimLocked(true), onAimEnd: () => director.setAimLocked(false) });
    const entry = { side: 'home', body: { pos: new THREE.Vector2(), radius: 0.085 } };
    input.pickEntry = () => entry;
    input.aimRay = () => input.raycaster.ray.set(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
    const down = { button: 0, pointerId: 1, timeStamp: 0, pointerType: 'touch' };
    for (const abort of [() => input.onCancel(down), () => events.dispatchEvent(new Event('blur')),
      () => events.dispatchEvent(new Event('resize')), () => input.cancel()]) {
      input.onDown(down); assert.equal(director.aimLocked, true);
      input.onDown({ ...down, pointerId: 2 }); assert.equal(input.pointerId, 1);
      abort(); assert.equal(director.aimLocked, false); assert.equal(shots, 0);
    }
    input.onDown(down); input.onMove = () => input.pull.set(0.4, 0);
    input.onUp(down); assert.equal(shots, 1); assert.equal(director.aimLocked, false);
    input.onDown(down); input.dispose(); assert.equal(director.aimLocked, false);
  });
});
