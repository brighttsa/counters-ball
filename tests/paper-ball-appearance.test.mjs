import test from 'node:test';
import assert from 'node:assert/strict';

test('ivory paper ball keeps its physical size with an outer-only silhouette', {
  skip: !process.env.COUNTERS_TEST_THREE,
}, async () => {
  const { THREE } = await import('./helpers/real-three-session-fixture.mjs');
  const { buildPaperMatchBall } = await import('../src/scene/match-ball-and-goal-posts.js');
  const { applyVenueInkTreatment } = await import('../src/scene/venue-ink-treatment.js');
  const { BALL_RADIUS } = await import('../src/core/pitch-dimensions-and-constants.js');
  const previous = globalThis.document;
  const strokes = [];
  const context = { fillRect() {}, beginPath() {}, moveTo() {}, quadraticCurveTo() {},
    stroke() { strokes.push(this.strokeStyle); },
    createRadialGradient: () => ({ addColorStop() {} }) };
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  try {
    const group = new THREE.Group(), ball = buildPaperMatchBall(group);
    assert.equal(ball.geometry.parameters.radius, BALL_RADIUS);
    assert.deepEqual(ball.scale.toArray(), [1, 1, 1]);
    assert.equal(ball.position.y, BALL_RADIUS);
    assert.equal(ball.material.emissive.getHex(), 0xfbfaf2);
    assert.equal(ball.material.emissiveIntensity, .15);
    assert.equal(ball.receiveShadow, false);
    assert.equal(ball.castShadow, true);
    assert.equal(strokes.length, 20);
    const outline = ball.getObjectByName('paper-ball-silhouette');
    assert.equal(outline.geometry, ball.geometry);
    assert.equal(outline.material.side, THREE.BackSide);
    assert.equal(outline.material.depthWrite, false);
    assert.equal(outline.material.toneMapped, false);
    assert.equal(outline.scale.x, 1.08);
    assert.equal(group.getObjectByName('ball-visibility-locator'), undefined);
    applyVenueInkTreatment({ group, caps: [], ballMesh: ball }, { backdrop: 'schoolyard' });
    assert.equal(ball.getObjectByName('selective-ink-contour'), undefined);
    assert.equal(ball.children.length, 1);
    ball.rotation.set(1, 2, 3);
    assert.equal(outline.parent, ball, 'outline must follow rolling and replay poses');
    outline.material.dispose(); ball.geometry.dispose(); ball.material.map.dispose(); ball.material.dispose();
  } finally { globalThis.document = previous; }
});
