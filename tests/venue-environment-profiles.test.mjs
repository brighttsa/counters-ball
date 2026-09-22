import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { CAMPAIGN_LEVELS, ATTRACT_MODE_LEVEL } from '../src/levels/campaign-level-definitions.js';
import { VENUE_ENVIRONMENTS } from '../src/scene/environment/venue-environment-compositions.js';
import { photographSettings, sameOriginPhotographPath } from '../src/scene/environment/location-photograph-configuration.js';
import { createSeededRandom } from '../src/core/seeded-random-number-generator.js';

test('photo grading defaults, aliases and malformed controls are bounded', () => {
  assert.deepEqual(photographSettings('nightbulb'), photographSettings('night'));
  assert.deepEqual(photographSettings('attract'), photographSettings('kiosk'));
  const spec = photographSettings('schoolyard', { saturation: 9, temperature: -9, blur: Infinity,
    opacity: -1, crop: null, focal: [NaN, 3], grade: [1], z: 0 });
  assert.equal(spec.saturation, 2); assert.equal(spec.temperature, -1);
  assert.equal(spec.blur, 2); assert.equal(spec.opacity, 0); assert.equal(spec.z, -16);
  assert.deepEqual(spec.crop, [1, 1]); assert.deepEqual(spec.focal, [0.5, 1]);
  assert.deepEqual(spec.grade, [1, 1, 0.96]);
  assert.equal(sameOriginPhotographPath({ enabled: true, credit: 42, license: 'ok', path: '/a.png' },
    'https://example.test'), null);
});

test('all actual campaign backdrops retain their compositions', () => {
  assert.equal(CAMPAIGN_LEVELS.length, 6);
  for (const level of CAMPAIGN_LEVELS) assert.ok(VENUE_ENVIRONMENTS[level.backdrop]);
  assert.equal(ATTRACT_MODE_LEVEL.backdrop, 'kiosk');
});

test('real Three architecture, motion and photo lifecycle', {
  skip: !process.env.COUNTERS_TEST_THREE && 'Set COUNTERS_TEST_THREE to Three r160',
}, async t => {
  registerHooks({ resolve(specifier, context, next) {
    return specifier === 'three'
      ? { url: pathToFileURL(process.env.COUNTERS_TEST_THREE).href, shortCircuit: true }
      : next(specifier, context);
  } });
  const THREE = await import('three'); assert.equal(THREE.REVISION, '160');
  const { buildVenueArchitecture, resolveEnvironmentKey } = await import('../src/scene/environment/venue-architecture-composition.js');
  const { buildStreetBackdrop } = await import('../src/scene/street-background-environment.js');
  const { buildLocationPhotograph } = await import('../src/scene/environment/optional-distant-location-photograph.js');
  // Only the canvas boundary is stubbed; scene geometry, materials and transforms are real.
  const gradient = { addColorStop() {} };
  const context = new Proxy({ measureText: () => ({ width: 50 }), getImageData: () => ({ data: [80, 70, 60, 255] }),
    createLinearGradient: () => gradient, createRadialGradient: () => gradient },
  { get: (o, key) => key in o ? o[key] : () => {} });
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('missing photo'); });
  const saved = Object.fromEntries(['document', 'location', 'matchMedia', 'createImageBitmap'].map(k => [k, globalThis[k]]));
  t.after(() => { for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
  } });
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  globalThis.location = { href: 'https://example.test/game/' };
  const motion = { matches: false }; globalThis.matchMedia = () => motion;
  const signature = root => {
    root.updateMatrixWorld(true);
    const parts = []; root.traverse(o => { if (o.isMesh) parts.push([
      o.geometry.type, o.geometry.parameters, o.matrixWorld.toArray(),
    ]); }); return JSON.stringify(parts);
  };
  const signatures = new Set();
  for (const level of CAMPAIGN_LEVELS) {
    const key = level.backdrop, parent = new THREE.Group();
    const a = buildVenueArchitecture(parent, key, createSeededRandom(42), VENUE_ENVIRONMENTS[key].wall);
    const b = buildVenueArchitecture(new THREE.Group(), key, createSeededRandom(42), VENUE_ENVIRONMENTS[key].wall);
    assert.equal(signature(a.root), signature(b.root)); signatures.add(signature(a.root));
    assert.equal(a.root.position.y, -0.92);
    a.root.updateMatrixWorld(true);
    a.root.traverse(o => { if (o.isMesh) {
      const bounds = new THREE.Box3().setFromObject(o);
      assert.ok(bounds.max.z < -2, `${key}: architecture enters table area`);
      assert.ok(Number.isFinite(bounds.min.x));
    } });
    a.update(1); const first = signature(a.root); a.update(4);
    if (key !== 'schoolyard') assert.notEqual(signature(a.root), first);
    const group = new THREE.Group(), backdrop = buildStreetBackdrop(group, key, { fog: '#888888' });
    const architecture = group.getObjectByName(`venue-architecture-${key}`);
    assert.ok(architecture);
    backdrop.update(0, 1); const before = signature(group);
    backdrop.update(200, 0); assert.equal(signature(group), before);
    motion.matches = true; backdrop.update(300, 2); assert.equal(signature(group), before);
    motion.matches = false; backdrop.dispose(); backdrop.update(400, 2); assert.equal(signature(group), before);
  }
  assert.equal(signatures.size, 6);
  assert.equal(resolveEnvironmentKey('nightbulb'), 'night');
  assert.equal(resolveEnvironmentKey('attract'), 'kiosk');
  const config = { enabled: true, path: '/licensed.png', credit: 'Author', license: 'Permission', opacity: 0.4 };
  const group = new THREE.Group(), fallback = new THREE.Object3D(); group.add(fallback);
  const failed = buildLocationPhotograph(group, 'kiosk', { fog: '#777777' }, null, config);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(group.children, [fallback]); failed.dispose();
  globalThis.fetch = async () => ({ ok: true, headers: { get: () => 'image/png' }, blob: async () => ({}) });
  let closed = 0;
  globalThis.createImageBitmap = async () => ({ width: 100, height: 100, close() { closed++; } });
  const photo = buildLocationPhotograph(group, 'nightbulb', { fog: '#777777' }, null, config);
  await new Promise(resolve => setImmediate(resolve));
  const mesh = group.children.find(o => o.isMesh); assert.ok(mesh);
  photo.update(1, 1); assert.equal(mesh.material.opacity, 0.4);
  const shader = { uniforms: {}, fragmentShader: '#include <map_fragment>\n#include <opaque_fragment>' };
  mesh.material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.photoSaturation.value, 0.8);
  assert.equal(shader.uniforms.photoBlur.value.x, 0.02);
  assert.ok(shader.fragmentShader.includes('photoTemperature * 0.12'));
  photo.dispose(); photo.dispose(); assert.equal(closed, 1); assert.deepEqual(group.children, [fallback]);
});
