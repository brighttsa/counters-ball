import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCATION_PHOTOGRAPHS, sameOriginPhotographPath }
  from '../src/scene/environment/location-photograph-configuration.js';

const base = 'https://counters.example/game/index.html';
const config = { enabled: true, path: '/photos/venue.jpg', credit: 'Photographer', license: 'Licensed with permission' };

test('venue photographs are disabled by default', () => {
  for (const spec of Object.values(LOCATION_PHOTOGRAPHS)) {
    assert.equal(spec.enabled, false);
    assert.equal(sameOriginPhotographPath(spec, base), null);
  }
  assert.equal(sameOriginPhotographPath(undefined, base), null);
});

test('photograph requires both nonblank credit and license', () => {
  for (const key of ['credit', 'license']) {
    for (const value of [undefined, '', '   ']) {
      assert.equal(sameOriginPhotographPath({ ...config, [key]: value }, base), null);
    }
  }
});

test('cross-origin photograph URLs are rejected', () => {
  assert.equal(sameOriginPhotographPath({ ...config, path: 'https://other.example/photo.jpg' }, base), null);
});

test('protocol-relative photograph URLs are rejected even for the same host', () => {
  for (const path of ['//other.example/photo.jpg', '//counters.example/photo.jpg']) {
    assert.equal(sameOriginPhotographPath({ ...config, path }, base), null);
  }
});

test('javascript photograph URLs are rejected', () => {
  assert.equal(sameOriginPhotographPath({ ...config, path: 'javascript:alert(1)' }, base), null);
});

test('attributed root-relative photograph path resolves on the current HTTP origin', () => {
  assert.equal(sameOriginPhotographPath(config, base), 'https://counters.example/photos/venue.jpg');
  assert.equal(sameOriginPhotographPath(config, 'http://localhost:4181/index.html'),
    'http://localhost:4181/photos/venue.jpg');
});
