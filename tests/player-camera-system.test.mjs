import test from 'node:test';
import assert from 'node:assert/strict';

test('player camera poses fit mechanics and preserve world-plane flick direction', {
  skip: !process.env.COUNTERS_TEST_THREE,
}, async t => {
  const { THREE } = await import('./helpers/real-three-session-fixture.mjs');
  const { playerCameraPose, loadCameraPreferences, pitchFramePoints, hudReservePixels } = await import('../src/fx/player-camera-view-poses.js');
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
  await t.test('Tactical and the Free overview frame both goals, lorries and outer lanes', () => {
    for (const aspect of [320 / 844, 375 / 844, 390 / 844, 430 / 844, 16 / 9]) {
      for (const mode of ['tactical', 'free']) for (const type of ['ruler-seesaw', 'departing-lorry']) {
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
  await t.test('Broadcast fills the screen with the table, rail to rail, and slides with the ball', () => {
    const previousSize = globalThis.window;
    const sizes = [[847, 751], [1078, 751], [1280, 720], [1440, 900], [1920, 1080], [2560, 1440],
      [568, 320], [844, 390], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768]];
    try {
      for (const [width, height] of sizes) for (const type of ['ruler-seesaw', 'departing-lorry']) {
        globalThis.window = { ...previousSize, innerWidth: width, innerHeight: height };
        const { top } = hudReservePixels(width, height);
        const bottom = Math.min(hudReservePixels(width, height).bottom, 60);
        const topY = 1 - 2 * top / height, bottomY = -(1 - 2 * bottom / height);
        const view = (ballX) => {
          const camera = new THREE.PerspectiveCamera(42, width / height, .1, 100);
          const pose = playerCameraPose(camera, 'broadcast',
            { ...session, level: { mechanic: { type } }, ballBody: { pos: new THREE.Vector2(ballX, 0) } });
          camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld(true);
          return { pose, at: (x, y, z) => new THREE.Vector3(x, y, z).project(camera) };
        };
        const label = `${width}x${height} ${type}`;
        // The table's full width at the aim point sits between the scoreboard and the bottom controls,
        // and fills that space (or the screen's width).
        const { pose, at } = view(0);
        const rails = [-1.2, 1.2].flatMap(z => [0, .05].map(y => at(pose.target.x, y, z)));
        for (const p of rails) assert.ok(Math.abs(p.x) < .96 && p.y < topY + .01 && p.y > bottomY - .01, label);
        const tall = Math.max(...rails.map(p => p.y)) - Math.min(...rails.map(p => p.y));
        const wide = Math.max(...rails.map(p => p.x)) - Math.min(...rails.map(p => p.x));
        assert.ok(tall > .9 * (topY - bottomY) || wide > .9 * 1.9, `table width fills the view at ${label}`);
        // Following: the aim point moves with the ball, never backwards, and each goal comes fully into view.
        let last = -Infinity;
        for (const ballX of [-1.6, -.8, 0, .8, 1.6]) {
          const { pose: follow, at: seen } = view(ballX);
          assert.ok(follow.target.x >= last - 1e-9, `follows the ball at ${label}`); last = follow.target.x;
          if (Math.abs(ballX) === 1.6) {
            for (const z of [-.26, .26]) {
              const post = seen(Math.sign(ballX) * 1.5, .12, z);
              assert.ok(Math.abs(post.x) < 1 && post.y < 1 && post.y > -1, `goal in view at ${label} ball ${ballX}`);
            }
          }
        }
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
