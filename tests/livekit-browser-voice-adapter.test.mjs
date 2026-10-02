import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveKitBrowserVoiceAdapter } from '../src/core/livekit-browser-voice-adapter.js';

function setup({ startAudio = async () => {}, capture = async () => ({}) } = {}) {
  const events = new Map(), appended = [], blocked = [], calls = [];
  const room = {
    localParticipant: { publishTrack: async () => {}, unpublishTrack: async () => {} },
    on: (event, callback) => events.set(event, callback),
    connect: async (_url, _token, options) => calls.push(['connect', options.autoSubscribe]),
    startAudio: () => { calls.push(['startAudio']); return startAudio(); },
    disconnect: async () => calls.push(['disconnect']),
  };
  const sdk = { Room: class { constructor() { return room; } },
    RoomEvent: { TrackSubscribed: 'subscribed', TrackUnsubscribed: 'unsubscribed', ActiveSpeakersChanged: 'speakers', AudioPlaybackStatusChanged: 'playback' },
    Track: { Kind: { Audio: 'audio' }, Source: { Microphone: 'microphone' } },
    createLocalAudioTrack: capture };
  const adapter = createLiveKitBrowserVoiceAdapter(sdk, { append: element => appended.push(element) }, () => {}, value => blocked.push(value));
  return { adapter, events, appended, blocked, calls, room };
}

function remoteTrack(play) {
  const element = { play, remove() { this.removed = true; } };
  return { kind: 'audio', attach: () => element, detach: () => [element], element };
}

test('joins with auto-subscribe and attaches remote audio at audible volume', async () => {
  const { adapter, events, appended, blocked, calls } = setup();
  await adapter.connect({ url: 'wss://voice.example', token: 'room-token' });
  const track = remoteTrack(async () => {});
  events.get('subscribed')(track);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls.slice(0, 2), [['connect', true], ['startAudio']]);
  assert.equal(appended[0].muted, false);
  assert.equal(appended[0].volume, 1);
  assert.equal(appended[0].autoplay, true);
  assert.equal(blocked.at(-1), false);
});

test('microphone tap starts capture and speaker unlock synchronously without waiting for permission', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia() {} } } });
  let resolveCapture, captureStarted = false, gesture = false;
  const h = setup({
    capture: () => { captureStarted = true; return new Promise(resolve => { resolveCapture = resolve; }); },
    startAudio: async () => { if (!gesture) throw new Error('gesture required'); },
  });
  try {
    await h.adapter.connect({ url: 'wss://voice.example', token: 'room-token' });
    assert.equal(h.blocked.at(-1), true);
    gesture = true;
    const captured = h.adapter.capture();
    captured.catch(() => {});
    assert.equal(captureStarted, true);
    assert.equal(h.calls.filter(([name]) => name === 'startAudio').length, 2);
    gesture = false;
    resolveCapture({ stop() {} });
    await captured;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.blocked.at(-1), false);
  } finally {
    await h.adapter.disconnect();
    if (previous) Object.defineProperty(globalThis, 'navigator', previous); else delete globalThis.navigator;
  }
});

test('room playback remains blocked even when individual elements play or detach', async () => {
  let allowed = false;
  const h = setup({ startAudio: async () => { if (!allowed) throw new Error('context blocked'); } });
  await h.adapter.connect({ url: 'wss://voice.example', token: 'room-token' });
  const track = remoteTrack(async () => {});
  h.events.get('subscribed')(track);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.blocked.at(-1), true);
  h.events.get('unsubscribed')(track);
  assert.equal(h.blocked.at(-1), true);
  allowed = true;
  await h.adapter.resumeAudio();
  assert.equal(h.blocked.at(-1), false);
});

test('follows SDK playback status changes, including late mobile suspension', async () => {
  const h = setup();
  await h.adapter.connect({ url: 'wss://voice.example', token: 'room-token' });
  assert.equal(typeof h.events.get('playback'), 'function');
  h.events.get('playback')(false);
  assert.equal(h.blocked.at(-1), true);
  h.events.get('playback')(true);
  assert.equal(h.blocked.at(-1), false);
});

test('audio recovery starts every element play before the SDK promise settles', async () => {
  let complete, finished = false;
  const h = setup({ startAudio: () => new Promise(resolve => { complete = () => { finished = true; resolve(); }; }) });
  let invokedBeforeCompletion = false;
  h.events.get('subscribed')(remoteTrack(async () => {}));
  await new Promise(resolve => setImmediate(resolve));
  h.events.get('subscribed')(remoteTrack(async () => { invokedBeforeCompletion = !finished; }));
  await new Promise(resolve => setImmediate(resolve));
  invokedBeforeCompletion = false;
  const recovering = h.adapter.resumeAudio();
  assert.equal(invokedBeforeCompletion, true);
  complete(); await recovering;
});

test('late playback rejection after disconnect does not reopen recovery controls', async () => {
  const h = setup();
  let reject;
  h.events.get('subscribed')(remoteTrack(() => new Promise((_resolve, no) => { reject = no; })));
  await h.adapter.disconnect();
  reject(new Error('stale playback'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.blocked.at(-1), false);
});

test('overlapping unlock requests share one SDK call and preserve change-only playback events', async () => {
  const pending = [];
  const h = setup({ startAudio: () => new Promise((resolve, reject) => pending.push({ resolve, reject })) });
  let sdkEnabled = false;
  h.room.canPlaybackAudio = false;
  const emitStatus = enabled => {
    if (sdkEnabled === enabled) return;
    sdkEnabled = enabled; h.room.canPlaybackAudio = enabled;
    h.events.get('playback')(enabled);
  };
  const joining = h.adapter.connect({ url: 'wss://voice.example', token: 'room-token' });
  await new Promise(resolve => setImmediate(resolve));
  const recovering = h.adapter.resumeAudio();
  assert.equal(pending.length, 1);
  pending[0].reject(new Error('gesture required'));
  await Promise.all([joining, recovering]);
  assert.equal(h.blocked.at(-1), true);
  const retry = h.adapter.resumeAudio();
  const sharedRetry = h.adapter.resumeAudio();
  assert.equal(pending.length, 2);
  emitStatus(true); pending[1].resolve();
  await Promise.all([retry, sharedRetry]);
  assert.equal(h.blocked.at(-1), false);
  emitStatus(false);
  assert.equal(h.blocked.at(-1), true);
});

test('surfaces autoplay rejection and retries remote audio on an explicit gesture', async () => {
  const { adapter, events, blocked } = setup();
  let attempts = 0;
  const track = remoteTrack(async () => { attempts++; if (attempts === 1) throw new Error('gesture required'); });
  events.get('subscribed')(track);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(blocked.at(-1), true);
  await adapter.resumeAudio();
  assert.equal(attempts, 2);
  assert.equal(blocked.at(-1), false);
});

test('keeps blocked state until every remote audio track is playable', async () => {
  const { adapter, events, blocked } = setup();
  let first = 0;
  const working = remoteTrack(async () => {});
  const blockedTrack = remoteTrack(async () => { first++; if (first === 1) throw new Error('gesture required'); });
  events.get('subscribed')(working); events.get('subscribed')(blockedTrack);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(blocked.at(-1), true);
  events.get('unsubscribed')(blockedTrack);
  assert.equal(blocked.at(-1), false);
  assert.equal(blockedTrack.element.removed, true);
  await adapter.disconnect();
});
