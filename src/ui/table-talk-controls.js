import { leaveTableTalk, renewTableTalkLease, requestTableTalkJoin } from '../core/live-match-room-transport.js';
import { createLiveKitBrowserVoiceAdapter } from '../core/livekit-browser-voice-adapter.js?v=4';
import { createNativeTableTalkVoiceAdapter } from '../core/native-table-talk-voice-adapter.js';
import { loadTableTalkBrowserSdk } from '../core/table-talk-browser-sdk-loader.js';
import { PrivateRoomVoiceSession } from '../core/private-room-voice-session.js?v=3';
import { createTableTalkCompactControl } from './table-talk-compact-control.js?v=2';
import { tableTalkVoiceErrorMessage, updateTableTalkMicrophoneFeedback } from './table-talk-microphone-feedback.js?v=2';

export function createTableTalkControls(root, api, music) {
  if (typeof root?.querySelector !== 'function') return { configure() {}, setInMatch() {}, leave: async () => {} };
  const joinButton = root.querySelector('[data-voice-action="join"]');
  const audioButton = root.querySelector('[data-voice-action="audio"]');
  const micButton = root.querySelector('[data-voice-action="mic"]');
  const micShortcut = root.querySelector('[data-table-talk-mic-shortcut]');
  const leaveButton = root.querySelector('[data-voice-action="leave"]');
  const status = root.querySelector('[data-table-talk-status]');
  const compactControl = createTableTalkCompactControl(root);
  const toggleButton = compactControl.button;
  const liveStatus = root.querySelector('[data-table-talk-live-status]');
  const roomParent = root.parentNode;
  const roomNextSibling = root.nextSibling;
  const setup = document.getElementById('table-talk-room-setup');
  const setupJoinButton = document.getElementById('table-talk-room-join');
  const joinButtons = [joinButton, setupJoinButton].filter(Boolean);
  let roomId = null, sessionId = null, leaseTimer = null, speakerTimer = null, session = null, native = null, stopping = false;
  let lastLeaseAt = 0;
  let playbackBlocked = false;
  let autoCollapseUsed = false, compact = false;

  function setCompact(value, manual = false) {
    compact = value;
    compactControl.setCompact(compact, root.dataset.state);
    if (manual) autoCollapseUsed = true;
  }

  function setInMatch(active) {
    root.dataset.inMatch = String(active);
    if (!roomParent || !document.body) return;
    if (active && root.parentNode !== document.body) document.body.append(root);
    else if (!active && root.parentNode !== roomParent) {
      roomParent.insertBefore(root, roomNextSibling?.parentNode === roomParent ? roomNextSibling : null);
    }
  }

  function update(state, message = '', error = '') {
    root.dataset.state = state;
    status.textContent = message || (playbackBlocked ? 'Room audio is blocked. Tap Enable room audio.' :
      ({ listening: 'Connected · mic off', speaking: 'Microphone on', 'requesting-microphone': 'Allow microphone access in the prompt' }[state] ?? 'Voice off'));
    if (liveStatus) liveStatus.textContent = status.textContent;
    if (state === 'connecting' && joinButtons.includes(document.activeElement)) status.focus();
    if (state === 'requesting-microphone' && document.activeElement === micButton) status.focus();
    const micRecovery = error.startsWith('microphone-');
    if (state === 'idle') {
      playbackBlocked = false;
      autoCollapseUsed = false;
      setCompact(false);
    } else if (state === 'connecting' || state === 'requesting-microphone' || playbackBlocked || micRecovery) {
      setCompact(false);
    } else if (['listening', 'speaking'].includes(state)) {
      const shouldAutoCollapse = !autoCollapseUsed;
      compactControl.setAvailable(true);
      if (shouldAutoCollapse) compactControl.focusIf([joinButton, audioButton, micButton, leaveButton, status]);
      setCompact(shouldAutoCollapse ? true : compact);
      if (shouldAutoCollapse) {
        autoCollapseUsed = true;
      }
    }
    compactControl.setAvailable(['listening', 'speaking'].includes(state) && !playbackBlocked && !micRecovery);
    joinButtons.forEach(button => { button.hidden = state !== 'idle'; button.disabled = state === 'connecting'; });
    if (setup) setup.hidden = !roomId || state !== 'idle';
    if (audioButton) audioButton.hidden = state === 'idle' || state === 'connecting' || !playbackBlocked;
    micButton.hidden = !['listening', 'speaking', 'requesting-microphone'].includes(state);
    leaveButton.hidden = state === 'idle' || state === 'connecting';
    updateTableTalkMicrophoneFeedback(root, state, error);
  }

  async function enter() {
    if (!roomId || session || native) return;
    update('connecting', 'Connecting to the table…'); joinButton.disabled = true;
    try {
      const credentials = await requestTableTalkJoin(api, roomId);
      sessionId = credentials.sessionId;
      const handler = globalThis.webkit?.messageHandlers?.konkTableTalk;
      if (handler) {
        native = createNativeTableTalkVoiceAdapter(handler, value => {
          update(value.state, tableTalkVoiceErrorMessage(value.error), value.error ?? '');
          music?.setRemoteVoiceActive(value.remoteSpeaking);
        });
        await native.join(credentials);
        const snapshot = await native.status();
        update(snapshot.state, snapshot.error ? tableTalkVoiceErrorMessage(snapshot.error) : 'Connected · mic off', snapshot.error ?? '');
      } else {
        const sdk = await loadTableTalkBrowserSdk();
        session = new PrivateRoomVoiceSession(() => createLiveKitBrowserVoiceAdapter(sdk,
          root.querySelector('[data-table-talk-audio]'), active => music?.setRemoteVoiceActive(active), blocked => {
            const changed = playbackBlocked !== blocked;
            playbackBlocked = blocked;
            if (blocked) update(session?.state ?? 'listening', 'Room audio is blocked. Tap Enable room audio.', session?.error ?? '');
            else if (changed) update(session?.state ?? 'listening', tableTalkVoiceErrorMessage(session?.error), session?.error ?? '');
          }),
        value => update(value.state, tableTalkVoiceErrorMessage(value.error), value.error ?? ''));
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

  joinButtons.forEach(button => button.addEventListener('click', enter));
  toggleButton?.addEventListener('click', () => setCompact(!compact, true));
  micShortcut?.addEventListener('click', () => {
    if (root.dataset.state === 'listening') { setCompact(false, true); status.focus(); }
    return toggleMic();
  });
  audioButton?.addEventListener('click', async () => {
    audioButton.disabled = true;
    try { await session?.adapter?.resumeAudio(); }
    finally { audioButton.disabled = false; }
  });
  micButton.addEventListener('click', toggleMic);
  leaveButton.addEventListener('click', () => stop(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden && sessionId) stop(true); });
  window.addEventListener('pagehide', () => { if (sessionId) stop(true); });

  return {
    setInMatch,
    configure(id, enabled) {
      const nextRoomId = enabled ? id : null;
      if (roomId === nextRoomId) return;
      if (roomId) void stop(true);
      roomId = nextRoomId;
      autoCollapseUsed = false;
      setCompact(false);
      root.hidden = !roomId;
      update('idle');
    },
    leave: () => stop(true),
  };
}
