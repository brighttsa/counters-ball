import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE } from './helpers/real-three-session-fixture.mjs';

const { screenPan } = await import('../src/audio/screen-space-stereo-pan.js');

function camera(position) {
  const cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 50);
  cam.position.copy(position);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  return cam;
}

test('contacts pan toward the side of the screen they happen on, never hard left or right', () => {
  const landscape = camera(new THREE.Vector3(0, 3, 3));
  assert.ok(screenPan(landscape, 1.2, 0) > 0.2, 'right of centre sounds right');
  assert.ok(screenPan(landscape, -1.2, 0) < -0.2, 'left of centre sounds left');
  assert.equal(screenPan(landscape, 0, 0), 0);
  assert.ok(Math.abs(screenPan(landscape, 40, 0)) <= 0.6);
});

test('panning follows the screen in portrait, where the pitch runs up the display', () => {
  const portrait = camera(new THREE.Vector3(-3.5, 3, 0));
  assert.ok(Math.abs(screenPan(portrait, 1.2, 0)) < 0.05, 'along the pitch is up the screen, so centred');
  assert.ok(screenPan(portrait, 0, 0.9) > 0.1, 'across the pitch is sideways on screen');
  assert.equal(screenPan(null, 1, 1), 0);
});
