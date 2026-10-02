export const VOICE_ROOM_LIMIT = 5;
export const VOICE_SEAT_LIMIT = 4;
export const VOICE_LEASE_MS = 45_000;
export const VOICE_SESSION_MS = 30 * 60_000;
export const VOICE_STATES = new Set(['reserved', 'active', 'closing', 'quarantined', 'closed']);

export function providerVoiceRoomName(roomId) {
  const encoded = Array.from(new TextEncoder().encode(roomId), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `konk-${encoded}`;
}

export function reserveVoiceSession(state, { roomId, seat, roomEpoch, seatGeneration, now, sessionId, identity }) {
  const sessions = Object.values(state.sessions ?? {});
  const roomSessions = sessions.filter((item) => item.roomId === roomId && item.state !== 'closed');
  const rooms = new Set(sessions.filter((item) => item.state !== 'closed').map((item) => item.roomId));
  if (sessions.some((item) => item.roomId === roomId && item.seat === seat && item.state !== 'closed')) {
    return { ok: false, status: 409, error: 'voice session already exists' };
  }
  if (roomSessions.length >= VOICE_SEAT_LIMIT) return { ok: false, status: 429, error: 'room voice is full' };
  if (!rooms.has(roomId) && rooms.size >= VOICE_ROOM_LIMIT) return { ok: false, status: 429, error: 'voice pilot is full' };
  const session = { roomId, seat, roomEpoch, seatGeneration, sessionId, identity,
    state: 'reserved', createdAt: now, deadlineAt: now + VOICE_SESSION_MS,
    leaseUntil: now + VOICE_LEASE_MS, cleanupAttempts: 0 };
  state.sessions ??= {};
  state.sessions[sessionId] = session;
  return { ok: true, session };
}

export function renewVoiceSession(session, proof, now) {
  if (!session || session.state !== 'active' || session.sessionId !== proof.sessionId ||
      session.roomId !== proof.roomId || session.seat !== proof.seat ||
      session.roomEpoch !== proof.roomEpoch || session.seatGeneration !== proof.seatGeneration) {
    return { ok: false, status: 409, error: 'voice session is stale' };
  }
  if (now >= session.deadlineAt || now >= session.leaseUntil) {
    return { ok: false, status: 410, error: 'voice session expired' };
  }
  session.leaseUntil = Math.min(now + VOICE_LEASE_MS, session.deadlineAt);
  return { ok: true, session };
}

export function beginVoiceCleanup(session, expected, now) {
  if (!session || session.sessionId !== expected.sessionId || session.roomId !== expected.roomId ||
      session.seatGeneration !== expected.seatGeneration) return { ok: false, stale: true };
  if (session.state === 'closed') return { ok: true, closed: true };
  session.state = 'closing';
  session.cleanupStartedAt ??= now;
  return { ok: true, session };
}

export function finishVoiceCleanup(session, confirmed, now) {
  if (!session || !['closing', 'quarantined'].includes(session.state)) return false;
  session.cleanupAttempts++;
  session.lastCleanupAt = now;
  session.state = confirmed ? 'closed' : 'quarantined';
  if (confirmed) session.closedAt = now;
  return true;
}

export function nextVoiceAlarmAt(state) {
  const open = Object.values(state.sessions ?? {}).filter((item) => item.state !== 'closed');
  return open.length ? Math.min(...open.map((item) =>
    item.state === 'quarantined' ? item.lastCleanupAt + Math.min(60_000, 1_000 * 2 ** item.cleanupAttempts)
      : Math.min(item.leaseUntil, item.deadlineAt))) : null;
}
