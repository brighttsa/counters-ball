import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveKitBrowserVoiceAdapter } from '../src/core/livekit-browser-voice-adapter.js';

function setup() {
  const events = new Map(), appended = [], blocked = [], calls = [];
  const room = {
    localParticipant: { publishTrack: async () => {}, unpublishTrack: async () => {} },
    on: (event, callback) => events.set(event, callback),
    connect: async (_url, _token, options) => calls.push(['connect', options.autoSubscribe]),
    startAudio: async () => calls.push(['startAudio']),
    disconnect: async () => calls.push(['disconnect']),
  };
  const sdk = { Room: class { constructor() { return room; } },
    RoomEvent: { TrackSubscribed: 'subscribed', TrackUnsubscribed: 'unsubscribed', ActiveSpeakersChanged: 'speakers' },
    Track: { Kind: { Audio: 'audio' }, Source: { Microphone: 'microphone' } },
    createLocalAudioTrack: async () => ({}) };
  const adapter = createLiveKitBrowserVoiceAdapter(sdk, { append: element => appended.push(element) }, () => {}, value => blocked.push(value));
  return { adapter, events, appended, blocked, calls };
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
  assert.deepEqual(blocked, [false]);
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
