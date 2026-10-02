const states = new Set(['idle', 'connecting', 'listening', 'requesting-microphone', 'speaking']);

export function createNativeTableTalkVoiceAdapter(handler, onState = () => {}) {
  if (typeof handler?.postMessage !== 'function') throw new Error('Native voice unavailable');
  async function send(command, payload = {}) {
    try {
      const response = await handler.postMessage({ command, ...payload });
      if (!states.has(response?.state) || (response.error !== null && typeof response.error !== 'string') ||
          typeof response.remoteSpeaking !== 'boolean') {
        throw new Error('Invalid reply');
      }
      const safe = { state: response.state,
        error: ['microphone-unavailable', 'voice-unavailable'].includes(response.error) ? response.error : null,
        remoteSpeaking: response.remoteSpeaking };
      onState(safe);
      return safe;
    } catch { throw new Error('Native voice unavailable'); }
  }
  return {
    join: ({ url, token }) => send('join', { url, token }),
    unmute: () => send('unmute'),
    mute: () => send('mute'),
    leave: () => send('leave'),
    status: () => send('status'),
  };
}
