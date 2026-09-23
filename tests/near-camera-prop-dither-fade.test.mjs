import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE } from './helpers/real-three-session-fixture.mjs';
const { NearCameraPropDitherFade } = await import('../src/fx/near-camera-prop-dither-fade.js');

// A tiny table: one tall pot and one low cap sharing a material, plus scenery far off the table.
function stage() {
  const shared = new THREE.MeshStandardMaterial();
  const pot = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .2), shared); pot.position.set(-1, .1, 0);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .024), shared); cap.position.set(0, .012, 0);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(1, 2, .1), new THREE.MeshStandardMaterial()); wall.position.set(0, 1, 4);
  const group = new THREE.Group(); group.add(pot, cap, wall);
  return { group, pot, cap, wall, shared };
}

test('only tall props on the table fade, each through its own copy of the material', () => {
  const s = stage();
  const fade = new NearCameraPropDitherFade({ group: s.group });
  assert.deepEqual(fade.props, [s.pot], 'the low cap and the off-table wall are left alone');
  assert.notEqual(s.pot.material, s.shared, 'the pot draws with a fading copy');
  assert.equal(s.cap.material, s.shared, 'the cap keeps the shared material, so it never fades');
});

test('the fade band follows the camera distance and switches off for replays', () => {
  const s = stage();
  const fade = new NearCameraPropDitherFade({ group: s.group });
  const camera = new THREE.PerspectiveCamera(); camera.position.set(-2, 1, 0);
  fade.update(camera, new THREE.Vector3(0, 0, 0));
  const distance = camera.position.length();
  assert.ok(Math.abs(fade.uniforms.uPropFadeNear.value - distance * .5) < 1e-9);
  assert.ok(Math.abs(fade.uniforms.uPropFadeFar.value - distance * .8) < 1e-9);
  fade.restore();
  assert.equal(fade.uniforms.uPropFadeFar.value, 0, 'far = 0 turns the fade off in the shader');
});

test('the shader patch discards a dither of near pixels in lit materials and skips unlit ones', () => {
  const s = stage();
  const fade = new NearCameraPropDitherFade({ group: s.group });
  const lit = { uniforms: {}, fragmentShader: 'varying vec3 vViewPosition;\nvoid main() {\n  gl_FragColor = vec4(1.0);\n}' };
  s.pot.material.onBeforeCompile(lit);
  assert.match(lit.fragmentShader, /void main\(\) \{\s*if \(uPropFadeFar > 0\.0\)/);
  assert.match(lit.fragmentShader, /discard/);
  assert.equal(lit.uniforms.uPropFadeNear, fade.uniforms.uPropFadeNear, 'uniforms are shared, not copied');
  const unlit = { uniforms: {}, fragmentShader: 'void main() {\n  gl_FragColor = vec4(1.0);\n}' };
  s.pot.material.onBeforeCompile(unlit);
  assert.doesNotMatch(unlit.fragmentShader, /discard/);
});

test('a prop that swaps material in play (a coin stack lighting up) fades again, reusing one copy', () => {
  const s = stage();
  const fade = new NearCameraPropDitherFade({ group: s.group });
  const camera = new THREE.PerspectiveCamera(); camera.position.set(-2, 1, 0);
  const lit = new THREE.MeshStandardMaterial({ emissive: 0xffcc00 });
  s.pot.material = lit;
  fade.update(camera, new THREE.Vector3());
  const copy = s.pot.material;
  assert.ok(copy.userData.nearCameraFade && copy !== lit, 'the lit material was swapped for its fading copy');
  assert.equal(copy.emissive.getHex(), 0xffcc00, 'the copy keeps the lit look');
  s.pot.material = lit;
  fade.update(camera, new THREE.Vector3());
  assert.equal(s.pot.material, copy, 'the same copy is reused, not rebuilt every frame');
});
