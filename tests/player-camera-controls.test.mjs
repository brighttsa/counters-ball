import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE } from './helpers/real-three-session-fixture.mjs';
const { cameraTransitionBlend, playerCameraPose, pitchFramePoints, hudReservePixels } = await import('../src/fx/player-camera-view-poses.js');

test('camera transitions settle after a throttled preview frame', () => {
  assert.ok(cameraTransitionBlend(1 / 60, true) < .3);
  assert.ok(cameraTransitionBlend(1, true) > .999);
  assert.equal(cameraTransitionBlend(0, false), 1);
});

test('phone and tablet framing fills usable space without cropping goal structures', () => {
  const previous = globalThis.window;
  try {
    for (const [width, height] of [[320,844],[375,844],[390,844],[430,844],[568,320],[844,390],[768,1024],[1024,768]]) {
      globalThis.window = { innerWidth: width, innerHeight: height };
      for (const type of ['ruler-seesaw', 'departing-lorry']) for (const mode of ['tactical', 'free']) {
        const session = { level: { mechanic: { type } } };
        const camera = new THREE.PerspectiveCamera(42, width / height, .1, 100);
        const pose = playerCameraPose(camera, mode, session);
        camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld(true);
        const points = pitchFramePoints(session).map(point => point.project(camera));
        for (const p of points) assert.ok(Math.abs(p.x) <= .951 && Math.abs(p.y) < 1, `${width}/${mode}`);
        const extent = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
        const vertical = Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y));
        const { top, bottom } = hudReservePixels(width, height);
        assert.ok(extent / 1.9 > .9 || vertical / (2 - 2 * (top + bottom) / height) > .9,
          `pitch too small at ${width}/${mode}`);
      }
    }
  } finally { globalThis.window = previous; }
});

test('Street Level reframes moved pieces and ignores a selected cap from the other side', () => {
  const camera = new THREE.PerspectiveCamera(42, 844/390, .1, 100);
  const home = { side: 'home', body: { pos: new THREE.Vector2(-.4,.2) } };
  const away = { side: 'away', body: { pos: new THREE.Vector2(1,0) } };
  const session = { rules: { turn: 'home' }, entries: [away,home], physics: {}, ballBody: { pos: new THREE.Vector2() } };
  const pose = playerCameraPose(camera, 'street', session);
  assert.deepEqual(playerCameraPose(camera, 'street', session, away), pose);
  session.ballBody.pos.set(.7,.4);
  assert.ok(playerCameraPose(camera, 'street', session).target.distanceTo(pose.target) > .1);
});

test('Street Level keeps cap, ball, and goal readable without extreme foreground scale', () => {
  for (const aspect of [320/844, 390/844, 844/390, 1024/768]) {
    const camera = new THREE.PerspectiveCamera(42, aspect, .1, 100);
    const session = { rules: { turn: 'home' }, entries: [{ side: 'home', body: { pos: new THREE.Vector2(-.4,.2) } }],
      physics: { goalCenters: { 1: 0 } }, ballBody: { pos: new THREE.Vector2(0,0) } };
    const pose = playerCameraPose(camera, 'street', session);
    camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld(true);
    assert.ok(camera.position.distanceTo(pose.target) >= 2.8);
    for (const [x,z] of [[-.4,.2],[0,0],[1.7,0],[-1.5,-1.05],[-1.5,1.05]]) {
      const p = new THREE.Vector3(x,0,z).project(camera);
      assert.ok(Math.abs(p.x) < .9 && p.y < .8 && p.y > -.82, `${aspect}: ${x},${z}`);
    }
  }
});
