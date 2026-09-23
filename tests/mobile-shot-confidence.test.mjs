import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseTouchCap } from '../src/gameplay/touch-cap-selection.js';

test('touch halos choose clear targets, reject ties and misses without ordering bias', () => {
  const a = { entry: 'a', distance: 20 }, b = { entry: 'b', distance: 23 };
  assert.deepEqual(chooseTouchCap([a, b]), { entry: null, ambiguous: true });
  assert.deepEqual(chooseTouchCap([b, a]), { entry: null, ambiguous: true });
  assert.equal(chooseTouchCap([{ ...a, distance: 0 }, b]).entry, 'a');
  assert.equal(chooseTouchCap([{ ...a, distance: 27 }]).entry, 'a');
  assert.deepEqual(chooseTouchCap([{ ...a, distance: 29 }]), { entry: null, ambiguous: false });
  assert.deepEqual(chooseTouchCap([]), { entry: null, ambiguous: false });
});

test('ambiguous touches cannot prepare or release a shot; clear touch still works', {
  skip: !process.env.COUNTERS_TEST_THREE,
}, async t => {
  const { THREE } = await import('./helpers/real-three-session-fixture.mjs');
  const { HumanDragAimInput } = await import('../src/gameplay/human-drag-aim-input.js');
  const previous = globalThis.window;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  t.after(() => { globalThis.window = previous; });
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
  camera.position.set(0, 5, .01); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  const canvas = new EventTarget();
  Object.assign(canvas, { classList: { add() {}, remove() {}, toggle() {} }, setPointerCapture() {},
    hasPointerCapture: () => false, getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }) });
  let shots = 0;
  const input = new HumanDragAimInput({ camera, domElement: canvas,
    visuals: { show() {}, hide() {}, hover() {} }, juice: { release() {}, press() {} },
    canControl: side => side === 'home', onFlick: () => shots++ });
  const entries = [-.10, .10].map(x => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(.085)); mesh.position.x = x; mesh.updateMatrixWorld(true);
    return { mesh, side: 'home', body: { pos: new THREE.Vector2(x, 0), radius: .085 } };
  });
  input.setEntries(entries);
  const e = { clientX: 200, clientY: 200, button: 0, pointerId: 1, pointerType: 'touch', timeStamp: 0 };
  input.onDown(e); assert.equal(input.selected, null);
  input.onUp({ ...e, clientY: 250, timeStamp: 300 }); assert.equal(shots, 0);
  entries[1].mesh.position.x = 1; entries[1].mesh.updateMatrixWorld(true);
  input.onDown(e); assert.equal(input.selected, entries[0]);
  input.onUp({ ...e, clientY: 250, timeStamp: 300 }); assert.equal(shots, 1);
  input.onDown(e); input.cancel(); input.onUp({ ...e, clientY: 250 }); assert.equal(shots, 1);
  input.dispose();
});

test('mobile framing keeps playable rails and goals clear of HUD reservations', {
  skip: !process.env.COUNTERS_TEST_THREE,
}, async t => {
  const { THREE } = await import('./helpers/real-three-session-fixture.mjs');
  const { playerCameraPose, pitchFramePoints } = await import('../src/fx/player-camera-view-poses.js');
  const old = globalThis.window;
  t.after(() => { globalThis.window = old; });
  for (const [width, height] of [[320,844],[375,844],[390,844],[430,844],[568,320],[844,390],[768,1024],[1024,768]]) {
    globalThis.window = { innerWidth: width, innerHeight: height };
    for (const mode of ['free', 'tactical']) for (const type of ['ruler-seesaw', 'departing-lorry']) {
      const camera = new THREE.PerspectiveCamera(42, width / height, .1, 100);
      const session = { level: { mechanic: { type } } };
      const pose = playerCameraPose(camera, mode, session);
      camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld(true);
      const portrait = width / height < .95;
      const top = portrait || height > 600 ? 136 : 80;
      const bottom = portrait || height > 600 ? 144 : 72;
      for (const point of pitchFramePoints(session)) {
        const p = point.project(camera);
        assert.ok(Math.abs(p.x) < .95, `${width} ${mode} horizontal`);
        const y = (1 - p.y) * height / 2;
        assert.ok(y > top && y < height - bottom, `${width} ${mode} HUD clearance`);
      }
    }
  }
});
