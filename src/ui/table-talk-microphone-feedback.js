const MESSAGES = {
  'microphone-denied': 'Microphone access is blocked.',
  'microphone-missing': 'No microphone was found.',
  'microphone-busy': 'Your microphone could not be opened.',
  'microphone-unsupported': 'Microphone access is unavailable in this tab.',
  'microphone-timeout': 'No microphone response yet. Your mic is still off.',
  'microphone-unavailable': 'Microphone could not start. Your mic is still off.',
};

export function tableTalkVoiceErrorMessage(error) {
  return MESSAGES[error] ?? (error ? 'Voice could not connect. Check your connection and try again.' : '');
}

export function updateTableTalkMicrophoneFeedback(root, state, error) {
  const button = root.querySelector('[data-voice-action="mic"]');
  const help = root.querySelector('[data-table-talk-help]');
  const requesting = state === 'requesting-microphone';
  const recovery = Boolean(MESSAGES[error]);
  button.textContent = state === 'speaking' ? 'Mute microphone' : requesting ? 'Cancel mic request' :
    recovery ? 'Try microphone again' : 'Turn mic on';
  button.disabled = false;
  if (!help) return;
  help.hidden = !requesting && !recovery;
  const native = Boolean(globalThis.webkit?.messageHandlers?.konkTableTalk);
  const permissionHelp = native ? 'Allow KONK! microphone access in your device settings, then try again.' :
    'In your browser’s website settings, allow Microphone for konk.world. Also check microphone access for Safari or Chrome in device settings. Reload this tab after changing access.';
  help.textContent = requesting ? 'Choose Allow when asked. No prompt? Cancel, check microphone access in your browser’s website settings, then try again.' :
    error === 'microphone-unsupported' ? 'Open https://konk.world in Safari or Chrome, then rejoin your room.' :
    error === 'microphone-busy' ? 'Close other calls or apps using your microphone, then try again.' :
    error === 'microphone-missing' ? 'Connect or enable a microphone, then try again.' : recovery ? permissionHelp : '';
}
