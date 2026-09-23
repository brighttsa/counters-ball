import test from 'node:test';
import assert from 'node:assert/strict';
import { startGameRenderLoop } from '../src/core/game-render-loop-and-viewport.js';

function fixture(run, width = 390, height = 844) {
  const originals = Object.fromEntries(['window', 'document', 'requestAnimationFrame']
    .map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const events = {}, calls = [];
  let nextFrame;
  const record = name => (...args) => calls.push([name, ...args]);
  globalThis.window = {
    innerWidth: width, innerHeight: height, devicePixelRatio: 3,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener: (name, callback) => { events[name] = callback; },
  };
  globalThis.document = { getElementById: () => null };
  globalThis.requestAnimationFrame = callback => { nextFrame = callback; };
  const app = { paused: false, session: { update: record('session') } };
  const camera = { aspect: width / height, updateProjectionMatrix: record('projection') };
  try {
    startGameRenderLoop({ app, camera,
      cameraDirector: { update: record('camera'), fitToViewport: record('fit'), focusDistance: 4 },
      renderer: { setPixelRatio: record('ratio'), setSize: record('renderer-size') },
      post: { setSize: record('post-size'), setFocus: record('focus'),
        update: record('post-update'), render: record('render') },
    });
    run({ calls, app, camera, frame: time => nextFrame(time),
      resize(w, h) { window.innerWidth = w; window.innerHeight = h; events.resize(); } });
  } finally {
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test('invalid viewports never resize targets or advance/render the game', () => {
  fixture(({ calls, resize, frame, camera }) => {
    for (const [width, height] of [[0, 844], [390, 0], [0, 0], [NaN, 844], [390, Infinity]]) {
      resize(width, height);
      frame(1000);
    }
    assert.deepEqual(calls, []);
    assert.equal(camera.aspect, 390 / 844);
    resize(844, 390);
    assert.equal(camera.aspect, 844 / 390);
    assert.deepEqual(calls.filter(c => c[0].endsWith('-size')),
      [['renderer-size', 844, 390], ['post-size', 844, 390]]);
    frame(100000);
    assert.deepEqual(calls.find(c => c[0] === 'session'), ['session', 0, 0]);
    assert.equal(calls.filter(c => c[0] === 'render').length, 1);
    frame(100016);
    assert.deepEqual(calls.filter(c => c[0] === 'session').at(-1), ['session', 0.016, 0.016]);
  });
});

test('initially collapsed viewport waits for a valid resize', () => {
  fixture(({ calls, frame, resize }) => {
    frame(1000);
    assert.deepEqual(calls, []);
    resize(320, 640);
    frame(2000);
    assert.deepEqual(calls.find(c => c[0] === 'session'), ['session', 0, 0]);
    assert.ok(calls.some(c => c[0] === 'render'));
  }, 0, 0);
});

test('paused recovery renders without advancing presentation', () => {
  fixture(({ calls, app, resize, frame }) => {
    app.paused = true;
    resize(0, 0);
    resize(430, 932);
    frame(1000);
    assert.ok(calls.some(c => c[0] === 'render'));
    assert.ok(!calls.some(c => c[0] === 'camera' || c[0] === 'post-update'));
    assert.deepEqual(calls.find(c => c[0] === 'session'), ['session', 0, 0]);
  });
});
