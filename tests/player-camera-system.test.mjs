import test from 'node:test';
import assert from 'node:assert/strict';

test('player camera poses fit mechanics and preserve world-plane flick direction', {
  skip: !process.env.COUNTERS_TEST_THREE,
}, async t => {
  const { THREE } = await import('./helpers/real-three-session-fixture.mjs');
  const { playerCameraPose, loadCameraPreferences, pitchFramePoints } = await import('../src/fx/player-camera-view-poses.js');
  const { HumanDragAimInput } = await import('../src/gameplay/human-drag-aim-input.js');
  const previous = globalThis.window;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  t.after(() => { globalThis.window = previous; });
  const session = { rules: { turn: 'home' }, physics: { goalCenters: { 1: .5 } },
    ballBody: { pos: new THREE.Vector2(.2, .1) }, entries: [] };
  await t.test('stored defaults reject malformed values and blocked storage', () => {
    assert.deepEqual(loadCameraPreferences({ getItem: () => '{broken' }), { home: 'broadcast', away: 'broadcast' });
    assert.deepEqual(loadCameraPreferences({ getItem: () => '{"home":"street","away":"invalid"}' }),
      { home: 'street', away: 'broadcast' });
    assert.deepEqual(loadCameraPreferences(null), { home: 'broadcast', away: 'broadcast' });
  });
  await t.test('Tactical and Broadcast frame both goals, lorries and outer lanes', () => {
    for (const aspect of [320 / 844, 375 / 844, 390 / 844, 430 / 844, 16 / 9]) {
      for (const mode of ['tactical', 'broadcast']) for (const type of ['ruler-seesaw', 'departing-lorry']) {
        const framed = { ...session, level: { mechanic: { type } } };
        const camera = new THREE.PerspectiveCamera(42, aspect, .1, 100);
        const pose = playerCameraPose(camera, mode, framed);
        camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld(true);
        for (const point of pitchFramePoints(framed)) {
          const p = point.clone().project(camera);
          assert.ok(Math.abs(p.x) < .95 && p.y < .62 && p.y > -.76, `${aspect}/${mode}/${type}`);
        }
      }
    }
  });
  await t.test('Broadcast fills the screen with the pitch on laptops and desktops, not the table around it', () => {
    const previousSize = globalThis.window;
    try {
      for (const [width, height] of [[1078, 751], [1280, 800], [1440, 900], [1920, 1080], [2560, 1440]]) {
        globalThis.window = { ...previousSize, innerWidth: width, innerHeight: height };
        const camera = new THREE.PerspectiveCamera(42, width / height, .1, 100);
        const pose = playerCameraPose(camera, 'broadcast', { ...session, level: { mechanic: { type: 'ruler-seesaw' } } });
        camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld(true);
        const xs = [-1.62, 1.62].flatMap(x => [-1.12, 1.12].map(z => new THREE.Vector3(x, 0, z).project(camera).x));
        assert.ok((Math.max(...xs) - Math.min(...xs)) / 2 > .8, `rails fill most of the width at ${width}x${height}`);
      }
    } finally { globalThis.window = previousSize; }
  });
  await t.test('same world drag yields the same physical velocity in every view', () => {
    let expected;
    for (const mode of ['tactical', 'broadcast', 'street', 'free']) {
      const camera = new THREE.PerspectiveCamera(42, 390 / 844, .1, 100);
      const pose = playerCameraPose(camera, mode, session);
      if (mode === 'free') pose.position.set(3, 4, -5);
      camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld(true);
      const canvas = new EventTarget();
      Object.assign(canvas, { classList: { add() {}, remove() {}, toggle() {} }, setPointerCapture() {},
        hasPointerCapture: () => false, getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }) });
      let velocity, shots = 0;
      const input = new HumanDragAimInput({ camera, domElement: canvas,
        visuals: { show() {}, hide() {}, hover() {} }, juice: { release() {}, press() {} }, canControl: () => true,
        onFlick: (_, v) => { velocity = v; shots++; } });
      input.pickEntry = () => ({ side: 'home', body: { pos: new THREE.Vector2(), radius: .085 } });
      const event = (x, z, timeStamp) => {
        const p = new THREE.Vector3(x, 0, z).project(camera);
        return { clientX: (p.x + 1) * 195, clientY: (1 - p.y) * 422, pointerId: 1, button: 0, timeStamp };
      };
      input.onDown(event(0, 0, 0)); input.onMove(event(-.3, -.1, 300)); input.onUp(event(-.3, -.1, 400));
      assert.equal(shots, 1); expected ??= velocity;
      assert.ok(velocity.distanceTo(expected) < 1e-8, mode);
      input.onDown(event(0, 0, 500)); input.onMove(event(-.3, -.1, 800));
      input.cancel(); input.onUp(event(-.3, -.1, 900));
      assert.equal(shots, 1, 'camera cancellation cannot submit the old pointer release');
      input.dispose();
    }
  });
});

test('camera occlusion hides only outside scenery and restores it', { skip: !process.env.COUNTERS_TEST_THREE }, async () => {
  const { THREE } = await import('./helpers/real-three-session-fixture.mjs');
  const { PlayerCameraOcclusion } = await import('../src/fx/player-camera-occlusion.js');
  const group = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1), new THREE.MeshStandardMaterial());
  wall.position.set(0, 1, 3);
  const obstacle = wall.clone(); obstacle.position.set(0, 0, 0); group.add(wall, obstacle);
  const guard = new PlayerCameraOcclusion({ group });
  const camera = new THREE.PerspectiveCamera(); camera.position.set(0, 1, 5);
  guard.update(camera, [new THREE.Vector3()]);
  assert.equal(wall.visible, false); assert.equal(obstacle.visible, true);
  guard.restore(); assert.equal(wall.visible, true);
});
