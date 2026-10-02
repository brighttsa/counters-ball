import { leaveTableTalk, renewTableTalkLease, requestTableTalkJoin } from '../core/live-match-room-transport.js';
import { createLiveKitBrowserVoiceAdapter } from '../core/livekit-browser-voice-adapter.js';
import { createNativeTableTalkVoiceAdapter } from '../core/native-table-talk-voice-adapter.js';
import { loadTableTalkBrowserSdk } from '../core/table-talk-browser-sdk-loader.js';
import { PrivateRoomVoiceSession } from '../core/private-room-voice-session.js';

export function createTableTalkControls(root, api, music) {
  if (typeof root?.querySelector !== 'function') return { configure() {}, leave: async () => {} };
  const joinButton = root.querySelector('[data-voice-action="join"]');
  const micButton = root.querySelector('[data-voice-action="mic"]');
  const leaveButton = root.querySelector('[data-voice-action="leave"]');
  const status = root.querySelector('[data-table-talk-status]');
  let roomId = null, sessionId = null, leaseTimer = null, speakerTimer = null, session = null, native = null, stopping = false;
  let lastLeaseAt = 0;

  function update(state, message = '') {
    root.dataset.state = state;
    status.textContent = message || ({ listening: 'Connected · mic off', speaking: 'Mic on', 'requesting-microphone': 'Allow microphone access' }[state] ?? 'Voice off');
    joinButton.hidden = state !== 'idle';
    micButton.hidden = !['listening', 'speaking', 'requesting-microphone'].includes(state);
    leaveButton.hidden = state === 'idle' || state === 'connecting';
    micButton.textContent = state === 'speaking' || state === 'requesting-microphone' ? 'Mute mic' : 'Unmute mic';
    micButton.disabled = state === 'requesting-microphone';
  }

  async function enter() {
    if (!roomId || session || native) return;
    joinButton.disabled = true; update('connecting', 'Connecting to the table…');
    try {
      const credentials = await requestTableTalkJoin(api, roomId);
      sessionId = credentials.sessionId;
      const handler = globalThis.webkit?.messageHandlers?.konkTableTalk;
      if (handler) {
        native = createNativeTableTalkVoiceAdapter(handler, value => {
          update(value.state);
          music?.setRemoteVoiceActive(value.remoteSpeaking);
        });
        await native.join(credentials);
        const snapshot = await native.status();
        update(snapshot.state, snapshot.error ? 'Voice could not connect' : 'Connected · mic off');
      } else {
        const sdk = await loadTableTalkBrowserSdk();
        session = new PrivateRoomVoiceSession(() => createLiveKitBrowserVoiceAdapter(sdk,
          root.querySelector('[data-table-talk-audio]'), active => music?.setRemoteVoiceActive(active)),
        value => update(value.state, value.error ? 'Microphone or voice unavailable' : ''));
        await session.join(credentials);
        if (session.state === 'idle') throw new Error('Voice could not connect');
      }
      lastLeaseAt = Date.now(); scheduleRenewal();
      if (native) scheduleSpeakerCheck();
    } catch {
      await stop(false);
      update('idle', 'Voice unavailable. The match is still yours.');
    } finally { joinButton.disabled = false; }
  }

  function scheduleRenewal(delay = 20_000) {
    clearTimeout(leaseTimer);
    leaseTimer = setTimeout(async () => {
      if (!sessionId || stopping) return;
      try {
        await renewTableTalkLease(api, roomId, sessionId);
        lastLeaseAt = Date.now(); scheduleRenewal();
      } catch (error) {
        if ([403, 410, 503].includes(error.status) || Date.now() - lastLeaseAt >= 40_000) {
          await stop(false); update('idle', 'Voice ended. Your match can continue.');
        } else scheduleRenewal(8_000);
      }
    }, delay);
  }

  function scheduleSpeakerCheck() {
    clearTimeout(speakerTimer);
    speakerTimer = setTimeout(async () => {
      if (!native || stopping) return;
      try { await native.status(); } catch { /* Keep local speech mix stable during bridge hiccups. */ }
      if (native) scheduleSpeakerCheck();
    }, 750);
  }

  async function toggleMic() {
    if (native) {
      const snapshot = await native.status();
      if (snapshot.state === 'speaking' || snapshot.state === 'requesting-microphone') await native.mute();
      else await native.unmute();
    } else if (session?.state === 'speaking' || session?.state === 'requesting-microphone') await session.mute();
    else await session?.unmute();
  }

  async function stop(notifyServer = true) {
    if (stopping) return;
    stopping = true; clearTimeout(leaseTimer); clearTimeout(speakerTimer); leaseTimer = speakerTimer = null;
    const oldSessionId = sessionId, oldRoomId = roomId;
    sessionId = null;
    await native?.leave().catch(() => {}); native = null;
    await session?.leave(); session = null;
    music?.setRemoteVoiceActive(false);
    if (notifyServer && oldSessionId && oldRoomId) {
      try { await leaveTableTalk(api, oldRoomId, oldSessionId); } catch { /* The server lease expires on its own. */ }
    }
    stopping = false;
    if (roomId) update('idle');
  }

  joinButton.addEventListener('click', enter);
  micButton.addEventListener('click', toggleMic);
  leaveButton.addEventListener('click', () => stop(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden && sessionId) stop(true); });
  window.addEventListener('pagehide', () => { if (sessionId) stop(true); });

  return {
    configure(id, enabled) {
      const nextRoomId = enabled ? id : null;
      if (roomId === nextRoomId) return;
      if (roomId) void stop(true);
      roomId = nextRoomId;
      root.hidden = !roomId;
      update('idle');
    },
    leave: () => stop(true),
  };
}
