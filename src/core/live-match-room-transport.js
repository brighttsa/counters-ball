// Transport for the live-match lobby. Gameplay commands will use the same room
// once the authoritative simulation is wired in; this keeps lobby state out of UI code.
const ROOM_ID = /^[a-km-np-zA-HJ-NP-Z2-9]{10}$/;
const PRODUCTION_API = 'https://konk-match-server.konk-match-server.workers.dev';
const TIMEOUT_MS = 8000;

export function roomSocketBase(base) {
  const url = new URL(base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.origin;
}

export function roomApiBase(loc = globalThis.location) {
  if (!loc) return '';
  return loc.hostname === 'localhost' || loc.hostname === '127.0.0.1' ? 'http://localhost:8787' : PRODUCTION_API;
}

async function call(base, path, init = {}, fetchImpl = globalThis.fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${base}${path}`, { ...init, signal: controller.signal,
      headers: init.body ? { 'Content-Type': 'application/json' } : undefined });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw Object.assign(new Error(body?.error ?? `room server replied ${response.status}`), { status: response.status });
    return body;
  } finally { clearTimeout(timer); }
}

// The server hands each seat a secret token on create/join; every later move or ready-up proves the seat with it.
const seatTokens = new Map();
const keep = (id) => (result) => { if (result?.token) seatTokens.set(id ?? result.id, result.token); return result; };

export function createLiveRoom(base, details, fetchImpl) {
  return call(base, '/rooms', { method: 'POST', body: JSON.stringify(details) }, fetchImpl).then(keep());
}

export function joinLiveRoom(base, id, name, fetchImpl) {
  return call(base, `/rooms/${id}/join`, { method: 'POST', body: JSON.stringify({ name }) }, fetchImpl).then(keep(id));
}

export function readLiveRoom(base, id, fetchImpl) {
  return call(base, `/rooms/${id}`, {}, fetchImpl);
}

export function setLiveRoomReady(base, id, seat, ready, fetchImpl) {
  return call(base, `/rooms/${id}/ready`, { method: 'POST', body: JSON.stringify({ seat, ready, token: seatTokens.get(id) }) }, fetchImpl);
}

export function setLiveRoomName(base, id, name, fetchImpl) {
  return call(base, `/rooms/${id}/name`, { method: 'POST', body: JSON.stringify({ name, token: seatTokens.get(id) }) }, fetchImpl);
}

export function heartbeatLiveRoom(base, id, seat, fetchImpl) {
  return call(base, `/rooms/${id}/heartbeat`, { method: 'POST', body: JSON.stringify({ seat, token: seatTokens.get(id) }) }, fetchImpl);
}

export function sendLiveRoomTurn(base, id, letter, fetchImpl) {
  return call(base, `/rooms/${id}/turn`, { method: 'POST', body: JSON.stringify({ letter, token: seatTokens.get(id) }) }, fetchImpl);
}

export function readLiveRoomTurn(base, id, fetchImpl) {
  return call(base, `/rooms/${id}/turn`, {}, fetchImpl);
}

export function connectLiveRoomSocket(base, id, onMessage, onState = () => {}, WebSocketImpl = globalThis.WebSocket) {
  const token = seatTokens.get(id);
  let socket = null;
  let closed = false;
  let retry = null;
  let heartbeat = null;
  let attempts = 0;
  const state = (connected) => onState(connected);
  const connect = () => {
    if (closed || !token || !WebSocketImpl) return;
    try {
      socket = new WebSocketImpl(`${roomSocketBase(base)}/rooms/${id}/socket`);
      socket.addEventListener('open', () => {
        attempts = 0;
        socket.send(JSON.stringify({ type: 'auth', token }));
        heartbeat = setInterval(() => {
          if (socket?.readyState === WebSocketImpl.OPEN) socket.send(JSON.stringify({ type: 'heartbeat' }));
        }, 5000);
        state(true);
      });
      socket.addEventListener('message', (event) => {
        try { onMessage(JSON.parse(event.data)); } catch { /* ignore malformed frames */ }
      });
      socket.addEventListener('close', () => {
        clearInterval(heartbeat);
        heartbeat = null;
        state(false);
        if (!closed) retry = setTimeout(connect, Math.min(1000 * (2 ** attempts++), 8000));
      });
      socket.addEventListener('error', () => socket?.close());
    } catch {
      state(false);
      if (!closed) retry = setTimeout(connect, Math.min(1000 * (2 ** attempts++), 8000));
    }
  };
  connect();
  return {
    get connected() { return socket?.readyState === WebSocketImpl?.OPEN; },
    close() {
      closed = true;
      clearTimeout(retry);
      clearInterval(heartbeat);
      socket?.close(1000, 'Leaving room');
    },
  };
}

export function roomLink(baseUrl, id) {
  return ROOM_ID.test(id ?? '') ? `${baseUrl}?room=${id}` : '';
}

export function takeRoomIdFromUrl(loc = globalThis.location, hist = globalThis.history) {
  const params = new URLSearchParams(loc.search);
  const id = params.get('room');
  if (!ROOM_ID.test(id ?? '')) return null;
  const url = new URL(loc.href);
  url.searchParams.delete('room');
  hist.replaceState(null, '', url.toString());
  return id;
}
