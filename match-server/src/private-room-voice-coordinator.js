import { DurableObject } from 'cloudflare:workers';
import { ROOM_ID, privateVoiceSeat } from './live-match-room-rules.js';
import { readBoundedText } from './bounded-request-body.js';
import { beginVoiceCleanup, finishVoiceCleanup, nextVoiceAlarmAt, providerVoiceRoomName, renewVoiceSession, reserveVoiceSession } from './private-voice-session-rules.js';
import { createVoiceProvider } from './private-room-voice-provider.js';

const SESSION_ID = /^[0-9a-f-]{36}$/i;

export async function routePrivateVoice(request, env, parts) {
  if (parts[0] !== 'rooms' || parts[2] !== 'voice' || parts.length !== 4) return null;
  if (!ROOM_ID.test(parts[1] ?? '') || !['join', 'renew', 'leave'].includes(parts[3])) return json({ error: 'not found' }, 404);
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (env.TABLE_TALK_ENABLED !== 'true') return json({ error: 'voice is not available' }, 503);
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim());
  if (!allowed.includes(request.headers.get('Origin') ?? '')) return json({ error: 'origin not allowed' }, 403);
  const credential = request.headers.get('Authorization')?.match(/^Bearer ([0-9a-f]{36})$/i)?.[1];
  if (!credential) return json({ error: 'seat authorization required' }, 401);
  const raw = await readBoundedText(request, 512);
  if (raw === null) return json({ error: 'request too large' }, 413);
  let input = {};
  try { input = raw ? JSON.parse(raw) : {}; } catch { return json({ error: 'invalid request' }, 400); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ error: 'invalid request' }, 400);
  return voiceStub(env).fetch(`https://voice/${parts[3]}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId: parts[1], credential, ...(input.sessionId ? { sessionId: input.sessionId } : {}) }) });
}

export class KonkVoiceCoordinator extends DurableObject {
  async fetch(request) {
    const action = new URL(request.url).pathname.slice(1);
    if (!['join', 'renew', 'leave'].includes(action) || request.method !== 'POST') return json({ error: 'not found' }, 404);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'invalid request' }, 400); }
    if (!ROOM_ID.test(body.roomId ?? '') || !/^[0-9a-f]{36}$/i.test(body.credential ?? '') ||
        (action !== 'join' && !SESSION_ID.test(body.sessionId ?? ''))) return json({ error: 'invalid request' }, 400);
    return this.ctx.blockConcurrencyWhile(() => this[action](body));
  }

  async join({ roomId, credential }) {
    const proof = await this.verifySeat(roomId, credential);
    if (!proof) return json({ error: 'active private seat required' }, 403);
    const state = await this.readState();
    const sessionId = crypto.randomUUID();
    const identity = crypto.randomUUID();
    const reserved = reserveVoiceSession(state, { roomId, seat: proof.seat, roomEpoch: proof.roomEpoch,
      seatGeneration: proof.seatGeneration, sessionId, identity, now: Date.now() });
    if (!reserved.ok) return json({ error: reserved.error }, reserved.status);
    const session = reserved.session;
    session.roomName = providerVoiceRoomName(roomId);
    session.displayName = proof.displayName;
    session.credentialHash = await digest(credential);
    await this.saveAndSchedule(state);
    const provider = this.provider();
    try {
      if (Object.values(state.sessions).filter((item) => item.roomId === roomId && item.sessionId !== sessionId && item.state !== 'closed').length === 0) {
        await provider.createRoom(session.roomName);
      }
      const stillSeated = await this.verifySeat(roomId, credential);
      if (!stillSeated || !sameGeneration(proof, stillSeated)) throw new Error('seat changed');
      const token = await provider.token({ room: session.roomName, identity, displayName: session.displayName });
      session.state = 'active';
      await this.saveAndSchedule(state);
      return json({ url: this.env.LIVEKIT_URL, token, sessionId, leaseMs: 30_000 });
    } catch {
      await this.cleanup(state, session, Date.now());
      return json({ error: 'voice could not start' }, 503);
    }
  }

  async renew({ roomId, credential, sessionId }) {
    const state = await this.readState();
    const session = state.sessions[sessionId];
    const proof = await this.verifySeat(roomId, credential);
    if (!proof || !session || !sameGeneration(session, proof)) {
      if (session?.roomId === roomId) await this.cleanup(state, session, Date.now());
      return json({ error: 'active private seat required' }, 403);
    }
    const now = Date.now();
    const renewed = renewVoiceSession(session, { roomId, seat: proof.seat, roomEpoch: proof.roomEpoch,
      seatGeneration: proof.seatGeneration, sessionId }, now);
    if (!renewed.ok) {
      if (renewed.status === 410) await this.cleanup(state, session, now);
      return json({ error: renewed.error }, renewed.status);
    }
    if (session.lastRenewedAt && now - session.lastRenewedAt < 10_000) {
      return json({ ok: true, sessionId, leaseMs: Math.max(0, session.leaseUntil - now) });
    }
    session.lastRenewedAt = now;
    await this.saveAndSchedule(state);
    return json({ ok: true, sessionId, leaseMs: 30_000 });
  }

  async leave({ roomId, credential, sessionId }) {
    const state = await this.readState();
    const session = state.sessions[sessionId];
    if (!session || session.roomId !== roomId || session.credentialHash !== await digest(credential)) {
      return json({ error: 'voice session not found' }, 404);
    }
    const result = await this.cleanup(state, session, Date.now());
    return result ? json({ ok: true }) : json({ error: 'voice cleanup pending' }, 503);
  }

  async alarm() {
    const state = await this.readState();
    const now = Date.now();
    for (const session of Object.values(state.sessions)) {
      if (session.state === 'closed') continue;
      let invalid = now >= session.leaseUntil || now >= session.deadlineAt;
      if (invalid || session.state === 'closing' || session.state === 'quarantined') await this.cleanup(state, session, now);
    }
    await this.saveAndSchedule(state);
  }

  async verifySeat(roomId, credential) {
    const response = await this.matchStub(roomId).fetch('https://match/internal/voice-seat', {
      headers: { Authorization: `Bearer ${credential}` },
    }).catch(() => null);
    return response?.ok ? response.json() : null;
  }

  async cleanup(state, session, now) {
    const cleanup = beginVoiceCleanup(session, session, now);
    if (!cleanup.ok) return false;
    if (cleanup.closed) return true;
    await this.saveAndSchedule(state);
    let confirmed = false;
    try {
      await this.provider().revoke(session.roomName, session.identity, now);
      confirmed = true;
    } catch { /* Keep uncertain provider state counted and retry from this coordinator. */ }
    finishVoiceCleanup(session, confirmed, now);
    await this.saveAndSchedule(state);
    return confirmed;
  }

  async readState() {
    const state = (await this.ctx.storage.get('voice-state')) ?? { sessions: {} };
    const cutoff = Date.now() - 24 * 60 * 60_000;
    for (const [id, item] of Object.entries(state.sessions)) {
      if (item.state === 'closed' && item.closedAt < cutoff) delete state.sessions[id];
    }
    return state;
  }

  async saveAndSchedule(state) {
    await this.ctx.storage.put('voice-state', state);
    const next = nextVoiceAlarmAt(state);
    if (next === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(Math.max(Date.now() + 250, next));
  }

  provider() { return createVoiceProvider(this.env); }

  matchStub(roomId) { return this.env.KONK_MATCH.get(this.env.KONK_MATCH.idFromName(roomId)); }

}

function sameGeneration(a, b) {
  return a.seat === b.seat && a.roomEpoch === b.roomEpoch && a.seatGeneration === b.seatGeneration;
}

async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function voiceStub(env) { return env.KONK_VOICE.get(env.KONK_VOICE.idFromName('pilot')); }

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
