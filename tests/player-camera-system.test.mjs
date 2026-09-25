import test from 'node:test';
import assert from 'node:assert/strict';

test('player camera poses fit mechanics and preserve world-plane flick direction', {
  skip: !process.env.COUNTERS_TEST_THREE,
}, async t => {
  const { THREE } = await import('./helpers/real-three-session-fixture.mjs');
  const { playerCameraPose, loadCameraPreferences, openingCameraMode, pitchFramePoints,
    hudReservePixels, tacticalViewBounds } = await import('../src/fx/player-camera-view-poses.js');
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
  await t.test('match openings never start in close or free inspection cameras', () => {
    assert.equal(openingCameraMode('tactical'), 'tactical');
    assert.equal(openingCameraMode('broadcast'), 'broadcast');
    assert.equal(openingCameraMode('street'), 'broadcast');
    assert.equal(openingCameraMode('free'), 'broadcast');
    assert.equal(openingCameraMode('invalid'), 'broadcast');
  });
  await t.test('phone landscape keeps smaller HUD reserves so the table stays close', () => {
    assert.deepEqual(hudReservePixels(844, 390), { top: 62, bottom: 54 });
    assert.deepEqual(hudReservePixels(390, 844), { top: 136, bottom: 144 });
  });
  await t.test('Tactical uses a closer phone-landscape frame than the safe HUD strip', () => {
    const oldWindow = globalThis.window;
    try {
      globalThis.window = { innerWidth: 568, innerHeight: 320 };
      assert.deepEqual(tacticalViewBounds(), { x: .98, top: .82, bottom: -.82 });
      const camera = new THREE.PerspectiveCamera(42, 568 / 320, .1, 100);
      const pose = playerCameraPose(camera, 'tactical', { ...session, level: { mechanic: { type: 'ruler-seesaw' } } });
      camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld(true);
      const ys = pitchFramePoints({ level: { mechanic: { type: 'ruler-seesaw' } } }).map(point => point.clone().project(camera).y);
      assert.ok((Math.max(...ys) - Math.min(...ys)) / 2 > .78, 'table fills tactical phone landscape');
    } finally { globalThis.window = oldWindow; }
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
  await t.test('Broadcast keeps both goals in view and fills the screen with the table', () => {
    const previousSize = globalThis.window;
    const sizes = [[847, 751], [1078, 751], [1280, 720], [1440, 900], [1920, 1080], [2560, 1440],
      [568, 320], [844, 390], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768]];
    try {
      for (const [width, height] of sizes) for (const type of ['ruler-seesaw', 'departing-lorry']) {
        globalThis.window = { ...previousSize, innerWidth: width, innerHeight: height };
        const { top } = hudReservePixels(width, height);
        const bottom = Math.min(hudReservePixels(width, height).bottom, 60);
        const topY = 1 - 2 * top / height, bottomY = -(1 - 2 * bottom / height);
        const camera = new THREE.PerspectiveCamera(42, width / height, .1, 100);
        const pose = playerCameraPose(camera, 'broadcast', { ...session, level: { mechanic: { type } } });
        camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld(true);
        const at = (x, y, z) => new THREE.Vector3(x, y, z).project(camera);
        const label = `${width}x${height} ${type}`;
        // Both goals, posts and crossbar (the lorries on lorry acts), fully on screen and clear of the HUD.
        const goalX = type === 'departing-lorry' ? 1.9 : 1.5;
        const goals = [-goalX, goalX].flatMap(x => [-.26, .26].flatMap(z => [0, .24].map(y => at(x, y, z))));
        for (const p of goals) assert.ok(Math.abs(p.x) < .96 && p.y < topY + .01 && p.y > bottomY - .01, `both goals in view at ${label}`);
        // The table's full width across the middle is in view, and the framing is tight: either the goals
        // reach the screen's sides or the table fills most of the height between the HUD bars.
        const rails = [-1.2, 1.2].flatMap(z => [0, .05].map(y => at(0, y, z)));
        for (const p of rails) assert.ok(p.y < topY + .01 && p.y > bottomY - .01, `table width in view at ${label}`);
        // In portrait the goals sit top and bottom and the width runs across the screen.
        const span = (points, axis) => Math.max(...points.map(p => p[axis])) - Math.min(...points.map(p => p[axis]));
        const portrait = width / height < .95;
        const tall = span(portrait ? goals : rails, 'y'), wide = span(portrait ? rails : goals, 'x');
        assert.ok(tall > .75 * (topY - bottomY) || wide > .9 * 1.9, `table fills the view at ${label}`);
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
