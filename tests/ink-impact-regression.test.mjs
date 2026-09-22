import test from 'node:test';
import assert from 'node:assert/strict';

test('ink rendering is scoped to the toll mechanic, not classic Roadside', {
  skip: !process.env.COUNTERS_TEST_THREE,
}, async () => {
  await import('./helpers/real-three-session-fixture.mjs');
  const { isInkRoadside, applyRoadsideInkTreatment } = await import('../src/scene/roadside-ink-treatment.js');
  assert.equal(isInkRoadside({ backdrop: 'roadside' }), false);
  assert.equal(isInkRoadside({ mechanic: { type: 'departing-lorry' } }), false);
  assert.equal(isInkRoadside({ mechanic: { type: 'toll-gates' } }), true);
  assert.equal(applyRoadsideInkTreatment({}, { backdrop: 'roadside' }), false);
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
