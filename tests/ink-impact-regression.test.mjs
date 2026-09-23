import test from 'node:test';
import assert from 'node:assert/strict';

test('ink rendering covers every venue without changing geometry or local lighting', {
  skip: !process.env.COUNTERS_TEST_THREE,
}, async () => {
  const { THREE } = await import('./helpers/real-three-session-fixture.mjs');
  const { applyVenueInkTreatment } = await import('../src/scene/venue-ink-treatment.js');
  for (const backdrop of ['schoolyard', 'kiosk', 'veranda', 'harmattan', 'night']) {
    const group = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0x327655 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    const light = new THREE.DirectionalLight(0xff9933, 2);
    const ballMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(.04), mat);
    group.add(mesh, ballMesh, light);
    const stage = { group, caps: [], ballMesh }, geometry = mesh.geometry;
    assert.equal(applyVenueInkTreatment(stage, { backdrop }), true);
    assert.equal(light.color.getHex(), 0xff9933);
    assert.equal(light.intensity, 2);
    assert.equal(mesh.geometry, geometry);
    assert.equal(mat.color.getHex(), 0x327655);
    assert.equal(mat.customProgramCacheKey(), 'venue-ink-v2');
    const shader = { fragmentShader: '#include <opaque_fragment>' };
    mat.onBeforeCompile(shader);
    assert.match(shader.fragmentShader, /inkBand/);
    assert.match(shader.fragmentShader, /inkRim/);
    assert.ok(mesh.getObjectByName('selective-ink-contour'));
    applyVenueInkTreatment(stage, { backdrop });
    assert.equal(mesh.children.length, 1, 'reapplying must not duplicate contours');
  }
});

test('contact strokes are bounded, strength-gated, pausable and reduced-motion safe', {
  skip: !process.env.COUNTERS_TEST_THREE,
}, async () => {
  const { THREE } = await import('./helpers/real-three-session-fixture.mjs');
  const { InkImpactBursts } = await import('../src/fx/ink-impact-contact-bursts.js');
  const previous = globalThis.window;
  let reduced = false;
  globalThis.window = { matchMedia: () => ({ matches: reduced }) };
  try {
    const root = new THREE.Group(), fx = new InkImpactBursts(root);
    fx.burst(0, 0, .1); assert.equal(root.children.filter(o => o.visible).length, 0);
    fx.burst(0, 0, .8); assert.equal(root.children.filter(o => o.visible).length, 6);
    const before = fx.bits.map(b => b.life); fx.update(0);
    assert.deepEqual(fx.bits.map(b => b.life), before);
    fx.update(.2); assert.equal(root.children.filter(o => o.visible).length, 0);
    reduced = true; fx.burst(0, 0, 1);
    assert.equal(root.children.filter(o => o.visible).length, 0);
    reduced = false;
    for (let i = 0; i < 100; i++) fx.burst(0, 0, 1, { x: 1, y: 0 });
    assert.equal(root.children.length, 24);
    assert.ok(root.children.every(o => Number.isFinite(o.position.x)));
  } finally { globalThis.window = previous; }
});
