import test from 'node:test';
import assert from 'node:assert/strict';
import { acquireMicrophoneAudioSession, useGamePlaybackAudioSession } from '../src/audio/browser-game-audio-session.js';

test('overlapping captures restore playback only when the last mic stops', () => {
  const session = { type: 'playback' }, env = { navigator: { audioSession: session } };
  const first = acquireMicrophoneAudioSession(env), second = acquireMicrophoneAudioSession(env);
  assert.equal(session.type, 'play-and-record');
  first(); first();
  assert.equal(session.type, 'play-and-record');
  second();
  assert.equal(session.type, 'playback');
});

test('game audio initialization cannot override a current microphone request', () => {
  const session = { type: 'auto' }, env = { navigator: { audioSession: session } };
  const release = acquireMicrophoneAudioSession(env);
  useGamePlaybackAudioSession(env);
  assert.equal(session.type, 'play-and-record');
  release();
  assert.equal(session.type, 'playback');
});

test('a later independent audio mode is not overwritten on release', () => {
  const session = { type: 'ambient' }, env = { navigator: { audioSession: session } };
  const release = acquireMicrophoneAudioSession(env);
  session.type = 'auto'; release();
  assert.equal(session.type, 'auto');
});

test('browsers without the optional audio-session API still work', () => {
  for (const env of [{}, { navigator: {} }, { navigator: { get audioSession() { throw new Error('unsupported'); } } },
    { navigator: { audioSession: { get type() { return 'auto'; }, set type(value) { throw new Error('unsupported'); } } } }]) {
    assert.doesNotThrow(() => { useGamePlaybackAudioSession(env); acquireMicrophoneAudioSession(env)(); });
  }
});
