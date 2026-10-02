import test from 'node:test';
import assert from 'node:assert/strict';
import { createTableTalkBrowserMicrophoneCapture } from '../src/core/table-talk-browser-microphone-capture.js';

function context() {
  let timer, cleared = 0;
  return {
    isSecureContext: true, navigator: { mediaDevices: { getUserMedia() {} } },
    setTimeout(callback) { timer = callback; return 1; }, clearTimeout() { cleared++; },
    expire() { timer(); }, cleared: () => cleared,
  };
}

test('capture starts in the tap stack without awaiting permissions or SDK work', async () => {
  const env = context(); let called = false;
  const capture = createTableTalkBrowserMicrophoneCapture({ createLocalAudioTrack(options) {
    called = true; assert.equal(options.echoCancellation, true); return Promise.resolve({ stop() {} });
  } }, env);
  const pending = capture.capture();
  assert.equal(called, true);
  await pending;
  assert.equal(env.cleared(), 1);
});

for (const [name, code] of [['NotAllowedError', 'microphone-denied'], ['NotFoundError', 'microphone-missing'],
  ['NotReadableError', 'microphone-busy'], ['SecurityError', 'microphone-denied']]) {
  test(`maps ${name} to actionable, non-provider feedback`, async () => {
    const capture = createTableTalkBrowserMicrophoneCapture({ createLocalAudioTrack() {
      return Promise.reject(Object.assign(new Error('private device details'), { name }));
    } }, context());
    await assert.rejects(capture.capture(), error => error.code === code && !error.message.includes('private'));
  });
}

test('unsupported and insecure pages never attempt capture', async () => {
  for (const modification of [{ isSecureContext: false }, { navigator: {} }]) {
    let calls = 0;
    const capture = createTableTalkBrowserMicrophoneCapture({ createLocalAudioTrack() { calls++; } }, Object.assign(context(), modification));
    await assert.rejects(capture.capture(), error => error.code === 'microphone-unsupported');
    assert.equal(calls, 0);
  }
});

for (const action of ['expire', 'cancel']) {
  test(`${action} settles a pending request and stops any late microphone track`, async () => {
    const env = context(); let resolve, stops = 0;
    const capture = createTableTalkBrowserMicrophoneCapture({ createLocalAudioTrack: () => new Promise(yes => { resolve = yes; }) }, env);
    const pending = capture.capture();
    const rejected = assert.rejects(pending, error => error.code === (action === 'expire' ? 'microphone-timeout' : 'microphone-cancelled'));
    if (action === 'expire') env.expire(); else capture.cancel();
    await rejected;
    resolve({ stop() { stops++; } });
    await new Promise(yes => setImmediate(yes));
    assert.equal(stops, 1);
  });
}
test('retry after cancellation stops the old track without stopping the new one', async () => {
  const resolutions = []; let oldStops = 0, newStops = 0;
  const capture = createTableTalkBrowserMicrophoneCapture({ createLocalAudioTrack: () => new Promise(yes => { resolutions.push(yes); }) }, context());
  const first = capture.capture();
  const canceled = assert.rejects(first, error => error.code === 'microphone-cancelled');
  const second = capture.capture();
  await canceled;
  resolutions[0]({ stop() { oldStops++; } });
  resolutions[1]({ stop() { newStops++; } });
  await second;
  assert.equal(oldStops, 1); assert.equal(newStops, 0);
});

test('failed capture releases the iPhone audio mode immediately', async () => {
  const env = context(); env.navigator.audioSession = { type: 'playback' };
  const capture = createTableTalkBrowserMicrophoneCapture({ createLocalAudioTrack() {
    assert.equal(env.navigator.audioSession.type, 'play-and-record');
    throw Object.assign(new Error('denied'), { name: 'NotAllowedError' });
  } }, env);
  await assert.rejects(capture.capture(), error => error.code === 'microphone-denied');
  assert.equal(env.navigator.audioSession.type, 'playback');
});

for (const action of ['cancel', 'expire']) {
  test(`${action} restores playback and a late old track cannot change the retry audio mode`, async () => {
    const env = context(); env.navigator.audioSession = { type: 'playback' };
    const resolves = [];
    const capture = createTableTalkBrowserMicrophoneCapture({ createLocalAudioTrack: () => new Promise(resolve => resolves.push(resolve)) }, env);
    const pending = capture.capture();
    const rejected = assert.rejects(pending);
    if (action === 'cancel') capture.cancel(); else env.expire();
    await rejected;
    assert.equal(env.navigator.audioSession.type, 'playback');
    const retry = capture.capture();
    resolves[0]({ stop() {} });
    resolves[1]({ stop() { assert.equal(env.navigator.audioSession.type, 'play-and-record'); } });
    const track = await retry;
    assert.equal(env.navigator.audioSession.type, 'play-and-record');
    track.stop();
    assert.equal(env.navigator.audioSession.type, 'playback');
  });
}

test('device-ended track releases the audio mode without another user tap', async () => {
  const env = context(); env.navigator.audioSession = { type: 'playback' };
  const mediaStreamTrack = new EventTarget();
  const capture = createTableTalkBrowserMicrophoneCapture({ createLocalAudioTrack: async () => ({ mediaStreamTrack, stop() {} }) }, env);
  const track = await capture.capture();
  mediaStreamTrack.dispatchEvent(new Event('ended'));
  assert.equal(env.navigator.audioSession.type, 'playback');
  track.stop();
  assert.equal(env.navigator.audioSession.type, 'playback');
});
