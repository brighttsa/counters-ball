import { PrivateRoomVoiceSession } from '/src/core/private-room-voice-session.js';
import { createLiveKitBrowserVoiceAdapter } from '/src/core/livekit-browser-voice-adapter.js';

const join = document.querySelector('#join'), microphone = document.querySelector('#microphone');
const leave = document.querySelector('#leave'), state = document.querySelector('#state');
const labels = { idle: 'Disconnected', connecting: 'Connecting', listening: 'Connected · Microphone off',
  'requesting-microphone': 'Microphone permission pending', speaking: 'Connected · Microphone on' };
const voice = new PrivateRoomVoiceSession(
  () => createLiveKitBrowserVoiceAdapter(window.LivekitClient, document.querySelector('#audio')),
  update => {
    state.textContent = update.error ? 'Audio unavailable · Microphone off' : labels[update.state];
    join.disabled = update.state !== 'idle'; leave.disabled = update.state === 'idle';
    microphone.disabled = !['listening', 'speaking', 'requesting-microphone'].includes(update.state);
    microphone.textContent = update.state === 'listening' ? 'Unmute' : 'Mute';
  },
);
join.addEventListener('click', async () => {
  join.disabled = true;
  try {
    const response = await fetch('/join', { method: 'POST' });
    if (!response.ok) throw new Error('Unavailable');
    await voice.join(await response.json());
  } catch { state.textContent = 'Audio test unavailable'; join.disabled = false; }
});
microphone.addEventListener('click', () => {
  if (voice.state === 'listening') void voice.unmute(); else void voice.mute();
});
leave.addEventListener('click', () => void voice.leave());
document.addEventListener('visibilitychange', () => { if (document.hidden) void voice.leave(); });
window.addEventListener('pagehide', () => void voice.leave());
