import test from 'node:test';
import assert from 'node:assert/strict';
import { firstFlickContact, flickPreview } from '../src/gameplay/flick-vector-contact-preview.js';

const cap = (x = 0, y = 0, radius = 0.085, kind = 'cap') => ({ pos: { x, y }, radius, kind });
test('first contact uses swept cap radius and never mutates bodies', () => {
  const body = cap(), ball = cap(0.5, 0, 0.035, 'ball'), other = cap(0.8);
  const before = JSON.stringify([body, ball, other]);
  const hit = firstFlickContact(body, { x: 1, y: 0 }, 2, [other, body, ball]);
  assert.equal(hit.kind, 'ball'); assert.ok(Math.abs(hit.distance - 0.38) < 1e-9);
  assert.equal(hit.alignment, 1); assert.equal(JSON.stringify([body, ball, other]), before);
  assert.equal(firstFlickContact(body, { x: 0, y: 0 }, 2, [ball]), null);
  assert.equal(firstFlickContact(body, { x: 1, y: 0 }, 0.2, [ball]), null);
  assert.equal(firstFlickContact(cap(1.535), { x: -1, y: 0 }, 0.2), null);
  assert.equal(firstFlickContact(cap(), { x: -1, y: 0 }, 0.2, [cap(0.17)]), null);
});
test('caps, obstacles, posts, tangency, overlap and both wall directions', () => {
  for (const kind of ['cap', 'post', 'stone', 'bottle']) {
    assert.equal(firstFlickContact(cap(), { x: 1, y: 0 }, 1, [cap(0.4, 0, 0.1, kind)]).kind, kind);
  }
  assert.ok(Math.abs(firstFlickContact(cap(), { x: 1, y: 0 }, 1,
    [cap(0.5, 0.12, 0.035, 'ball')]).distance - 0.5) < 1e-7);
  assert.equal(firstFlickContact(cap(), { x: 1, y: 0 }, 1, [cap(0.1)]).distance, 0);
  for (const sign of [-1, 1]) {
    const hit = firstFlickContact(cap(), { x: sign, y: 0 }, 2);
    assert.equal(hit.kind, 'wall'); assert.equal(hit.normal.x, -sign);
  }
  assert.ok(flickPreview({ ...cap(), linearDamping: 2.295, constantFriction: 0.432 },
    { x: 0.85, y: 0 }).range < flickPreview(cap(), { x: 0.85, y: 0 }).range);
});

test('projected mobile widths and pausable aim lifecycle', { skip: !process.env.COUNTERS_TEST_THREE }, async () => {
  const { THREE } = await import('./helpers/real-three-session-fixture.mjs');
  const { projectedFlickWidth, flickWidthPixels } = await import('../src/gameplay/flick-vector-projected-width.js');
  const { AimVisuals } = await import('../src/gameplay/aim-trajectory-power-ring-and-rim-glow.js');
  for (const width of [320, 375, 390, 430, 1440]) {
    const height = width < 600 ? 844 : 960, mobile = width < 600;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 40);
    camera.position.set(mobile ? -6 : 0.4, 4, mobile ? 0.5 : 4); camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const canvas = { getBoundingClientRect: () => ({ width, height }) };
    for (const power of [0.1, 0.5, 1]) {
      const w = projectedFlickWidth(camera, canvas, { x: 0, y: 0 }, { x: 1, y: 0 }, power, mobile);
      const a = new THREE.Vector3(0, 0.035, w / 2).project(camera);
      const b = new THREE.Vector3(0, 0.035, -w / 2).project(camera);
      const pixels = Math.hypot((a.x - b.x) * width / 2, (a.y - b.y) * height / 2);
      assert.ok(Math.abs(pixels - flickWidthPixels(power, mobile)) < 0.001);
      // Slim but still readable: never thinner than 14px under a thumb or 11px with a mouse, and never the
      // table-covering 40-50px ribbon it used to be on phones.
      assert.ok(flickWidthPixels(power, mobile) >= (mobile ? 14 : 11));
      assert.ok(flickWidthPixels(power, mobile) <= (mobile ? 26 : 21));
    }
    const parent = new THREE.Group(), aim = new AimVisuals(parent, { camera, canvas, physics: { bodies: [] } });
    aim.show(cap(), { x: 0.085, y: 0 }); assert.equal(aim.ribbon.visible, true);
    aim.hide(); assert.equal(aim.ribbon.visible, false); assert.equal(aim.flash.visible, false);
    aim.release(cap(), { x: 2, y: 0 }); assert.equal(aim.flash.visible, true);
    aim.update(9, 0); assert.equal(aim.flash.material.opacity, 0.65);
    aim.update(9.2, 0.2); assert.equal(aim.flash.visible, false);
    aim.dispose(); aim.dispose(); assert.equal(parent.children.length, 0);
  }
});
