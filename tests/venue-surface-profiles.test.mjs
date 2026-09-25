import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { paintTableSurfaceTextures } from '../src/scene/table-surface-texture-painters.js';
import { paintSurfaceMaterialWear } from '../src/scene/table-surface-material-wear-painter.js';
import { drawChalkPitchMarkings } from '../src/scene/chalk-pitch-markings.js';
import { getVenueVisualProfile } from '../src/scene/venue-visual-profiles.js';
import { createSeededRandom } from '../src/core/seeded-random-number-generator.js';
import { CAMPAIGN_LEVELS, ATTRACT_MODE_LEVEL } from '../src/levels/campaign-level-definitions.js';

// Node has no Path2D; the maker's signature is vector paths, so keep the path data for the digests.
globalThis.Path2D ??= class Path2D { constructor(d) { this.d = d; } };

// Record Canvas API calls to test determinism and geometry, not rendered quality.
function recordingContext() {
  const calls = [], state = {}, stack = [];
  const methods = Object.fromEntries(['fillRect', 'strokeRect', 'beginPath', 'moveTo', 'lineTo',
    'quadraticCurveTo', 'stroke', 'fill', 'arc', 'ellipse', 'translate', 'rotate', 'scale', 'strokeText', 'fillText']
    .map(name => [name, (...args) => calls.push([name, args, { ...state }])]));
  Object.assign(methods, {
    save() { stack.push({ ...state }); },
    restore() {
      const saved = stack.pop(); assert.ok(saved);
      for (const key of Object.keys(state)) delete state[key];
      Object.assign(state, saved);
    },
    createRadialGradient(...args) {
      const gradient = { args, stops: [], addColorStop(...stop) { this.stops.push(stop); } };
      return gradient;
    },
  });
  return { calls, state, stack, ctx: new Proxy(methods, {
    set(_, key, value) { state[key] = value; return true; },
    get(target, key) { return key in target ? target[key] : state[key]; },
  }) };
}
const digest = calls => createHash('sha256').update(JSON.stringify(calls)).digest('hex');

function render(profile, seed) {
  const canvases = [];
  const previous = globalThis.document;
  globalThis.document = { createElement(tag) {
    assert.equal(tag, 'canvas');
    const record = recordingContext();
    const canvas = { ...record, getContext: () => record.ctx };
    canvases.push(canvas); return canvas;
  } };
  try {
    const result = paintTableSurfaceTextures({ kind: 'cardboard', base: '#000000' }, seed, profile);
    assert.deepEqual(Object.values(result), canvases);
    return canvases.map(canvas => {
      assert.equal(canvas.width, 1408); assert.equal(canvas.height, 1024);
      assert.equal(canvas.stack.length, 0);
      return digest(canvas.calls);
    });
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
}

test('six canonical profiles preserve campaign identity, rules and aliases', () => {
  assert.deepEqual(CAMPAIGN_LEVELS.map(level => level.name), ['Schoolyard Break', 'Kiosk Corner',
    'Veranda Derby', 'Roadside Showdown', 'Harmattan Haze', 'Lights Out Final']);
  const before = JSON.stringify(CAMPAIGN_LEVELS);
  const profiles = CAMPAIGN_LEVELS.map(level => getVenueVisualProfile(level.backdrop));
  assert.equal(new Set(profiles).size, 6);
  assert.equal(profiles[0].surface.kind, 'concrete');
  assert.ok(profiles[1].surface.taped);
  assert.ok(profiles[2].surface.varnished);
  assert.equal(profiles[3].surface.planks, 6);
  assert.ok(profiles[4].surface.dusty);
  assert.ok(profiles[5].surface.salt && profiles[5].surface.carvings.length);
  assert.equal(getVenueVisualProfile('nightbulb'), profiles[5]);
  assert.equal(getVenueVisualProfile(), profiles[1]);
  assert.equal(getVenueVisualProfile('attract'), getVenueVisualProfile(ATTRACT_MODE_LEVEL.backdrop));
  assert.equal(getVenueVisualProfile('unknown'), profiles[1]);
  for (const profile of profiles) {
    assert.ok(Object.isFrozen(profile) && Object.isFrozen(profile.surface) && Object.isFrozen(profile.markings));
  }
  assert.equal(JSON.stringify(CAMPAIGN_LEVELS), before);
});

test('all six surfaces produce distinct, repeatable color, bump and roughness maps', () => {
  const random = Math.random;
  Math.random = () => { throw new Error('Unseeded surface randomness'); };
  try {
    const signatures = CAMPAIGN_LEVELS.map(level => {
      const profile = getVenueVisualProfile(level.backdrop);
      const first = render(profile, 12345);
      assert.deepEqual(render(profile, 12345), first);
      const different = render(profile, 54321);
      first.forEach((hash, i) => assert.notEqual(hash, different[i]));
      return first;
    });
    for (let channel = 0; channel < 3; channel++) {
      assert.equal(new Set(signatures.map(value => value[channel])).size, 6);
    }
  } finally { Math.random = random; }
});

test('playable table textures use marks and wear, not readable words', () => {
  const random = Math.random;
  Math.random = () => { throw new Error('Unseeded surface randomness'); };
  try {
    for (const level of CAMPAIGN_LEVELS) {
      const [colorCalls] = render(getVenueVisualProfile(level.backdrop), 24680);
      assert.ok(colorCalls);
    }
  } finally { Math.random = random; }
  for (const level of CAMPAIGN_LEVELS) {
    const profile = getVenueVisualProfile(level.backdrop);
    const previous = globalThis.document;
    const canvases = [];
    globalThis.document = { createElement() {
      const record = recordingContext();
      const canvas = { ...record, getContext: () => record.ctx };
      canvases.push(canvas); return canvas;
    } };
    try {
      paintTableSurfaceTextures({ kind: 'cardboard', base: '#000000' }, 24680, profile);
    } finally {
      if (previous === undefined) delete globalThis.document;
      else globalThis.document = previous;
    }
    for (const canvas of canvases) {
      assert.equal(canvas.calls.filter(([name]) => name === 'fillText' || name === 'strokeText').length, 0, level.id);
    }
  }
});

test('material wear coordinates match across albedo, bump and roughness', () => {
  for (const level of CAMPAIGN_LEVELS) {
    const surface = getVenueVisualProfile(level.backdrop).surface;
    const geometry = ['color', 'bump', 'roughness'].map(channel => {
      const { ctx, calls } = recordingContext();
      paintSurfaceMaterialWear(ctx, createSeededRandom(71), surface, 1408, 1024, channel);
      return calls.map(([name, args]) => [name, args]);
    });
    assert.deepEqual(geometry[0], geometry[1]);
    assert.deepEqual(geometry[0], geometry[2]);
  }
});

test('marking profiles affect every stroke and preserve goal-post and pitch coordinates', () => {
  const toPx = (x, z) => [704 + x * 320, 512 + z * 320];
  for (const level of CAMPAIGN_LEVELS) {
    const style = getVenueVisualProfile(level.backdrop).markings;
    const { ctx, calls, stack } = recordingContext();
    drawChalkPitchMarkings(ctx, toPx, createSeededRandom(93), style);
    const strokes = calls.filter(([name]) => name === 'stroke');
    for (const [, , state] of strokes) {
      assert.equal(state.strokeStyle, style.color);
      assert.equal(state.shadowBlur, style.blur);
      assert.ok(state.lineWidth >= style.width * 0.8 && state.lineWidth <= style.width * 1.2);
      assert.ok(state.globalAlpha <= style.alpha && state.globalAlpha >= style.alpha * 0.72);
    }
    const points = calls.filter(([name]) => name === 'arc').map(([, args]) => args.slice(0, 2));
    for (const x of [-1.5, 1.5]) for (const z of [-0.26, 0.26]) {
      assert.ok(points.some(point => JSON.stringify(point) === JSON.stringify(toPx(x, z))));
    }
    const ends = calls.filter(([name]) => name === 'lineTo').map(([, args]) => args);
    for (const x of [-1.5, 1.5]) for (const z of [-1, 1]) {
      assert.ok(ends.some(point => JSON.stringify(point) === JSON.stringify(toPx(x, z))));
    }
    assert.equal(stack.length, 0);
    assert.equal(calls.some(([name]) => name === 'fillRect'), style.blur > 0);
  }
});
