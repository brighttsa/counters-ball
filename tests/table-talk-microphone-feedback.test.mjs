import test from 'node:test';
import assert from 'node:assert/strict';
import { tableTalkVoiceErrorMessage, updateTableTalkMicrophoneFeedback } from '../src/ui/table-talk-microphone-feedback.js';

test('publication failure explains reconnecting instead of asking for microphone permission again', () => {
  const button = {}, help = {};
  updateTableTalkMicrophoneFeedback({ querySelector: selector => selector.includes('help') ? help : button },
    'listening', 'microphone-publish-failed');
  assert.match(tableTalkVoiceErrorMessage('microphone-publish-failed'), /microphone opened/);
  assert.match(help.textContent, /Leave voice and join again/);
  assert.doesNotMatch(help.textContent, /settings|allow Microphone/);
  assert.equal(help.hidden, false);
  assert.equal(button.disabled, false);
});
