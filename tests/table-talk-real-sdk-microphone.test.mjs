import test from 'node:test';
import assert from 'node:assert/strict';
import { createTableTalkBrowserMicrophoneCapture } from '../src/core/table-talk-browser-microphone-capture.js';
import { realVoiceSdk, microphoneTrack } from './helpers/table-talk-real-sdk-harness.mjs';

test('shipped SDK captures after game playback and restores playback only after stopping mic', async () => {
  const audioSession = { type: 'playback' };
  const raw = microphoneTrack();
  let calls = 0;
  const environment = { isSecureContext: true, setTimeout, clearTimeout,
    navigator: { audioSession, mediaDevices: { getUserMedia() {
      calls++;
      // WebKit LayoutTests/media/audioSession/getUserMedia.html rejects this mode.
      if (audioSession.type === 'playback') return Promise.reject(new DOMException('Incompatible audio session', 'InvalidStateError'));
      return Promise.resolve({ getTracks: () => [raw] });
    } } } };
  const sdk = realVoiceSdk(environment);
  const capture = createTableTalkBrowserMicrophoneCapture(sdk, environment);
  const pending = capture.capture();
  assert.equal(calls, 1, 'getUserMedia must still start in the tap');
  const track = await pending;
  assert.ok(track instanceof sdk.LocalAudioTrack);
  assert.equal(track.source, sdk.Track.Source.Microphone);
  assert.equal(audioSession.type, 'play-and-record');
  track.stop();
  assert.equal(raw.readyState, 'ended');
  assert.equal(audioSession.type, 'playback');
});
