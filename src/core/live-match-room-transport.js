// Transport for the live-match lobby. Gameplay commands will use the same room
// once the authoritative simulation is wired in; this keeps lobby state out of UI code.
const ROOM_ID = /^[a-km-np-zA-HJ-NP-Z2-9]{10}$/;
const PRODUCTION_API = 'https://konk-match-server.konk-match-server.workers.dev';
const TIMEOUT_MS = 8000;

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

export function createLiveRoom(base, details, fetchImpl) {
  return call(base, '/rooms', { method: 'POST', body: JSON.stringify(details) }, fetchImpl);
}

export function joinLiveRoom(base, id, name, fetchImpl) {
  return call(base, `/rooms/${id}/join`, { method: 'POST', body: JSON.stringify({ name }) }, fetchImpl);
}

export function readLiveRoom(base, id, fetchImpl) {
  return call(base, `/rooms/${id}`, {}, fetchImpl);
}

export function setLiveRoomReady(base, id, seat, ready, fetchImpl) {
  return call(base, `/rooms/${id}/ready`, { method: 'POST', body: JSON.stringify({ seat, ready }) }, fetchImpl);
}

export function heartbeatLiveRoom(base, id, seat, fetchImpl) {
  return call(base, `/rooms/${id}/heartbeat`, { method: 'POST', body: JSON.stringify({ seat }) }, fetchImpl);
}

export function roomLink(baseUrl, id) {
  return ROOM_ID.test(id ?? '') ? `${baseUrl}room/${id}` : '';
}
