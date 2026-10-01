const KEY = 'konk:room-recovery:v1';
const ROOM = /^[a-km-np-zA-HJ-NP-Z2-9]{10}$/;
const TOKEN = /^[a-f0-9]{36}$/;
const SEATS = ['home', 'away', 'p1', 'p2', 'p3', 'p4'];
const LIFETIME = 30 * 24 * 60 * 60 * 1000;
export function recoveredRoomSeats(storage = globalThis.localStorage, now = Date.now()) {
  try {
    const rows = JSON.parse(storage?.getItem(KEY) || '[]');
    return Array.isArray(rows) ? rows.filter(r => ROOM.test(r.id) && TOKEN.test(r.token) && SEATS.includes(r.seat)
      && Number.isFinite(r.savedAt) && r.savedAt <= now && now - r.savedAt < LIFETIME).slice(0, 10) : [];
  } catch { return []; }
}
export function rememberRoomSeat(id, token, seat, storage = globalThis.localStorage, now = Date.now()) {
  if (!ROOM.test(id) || !TOKEN.test(token) || !SEATS.includes(seat)) return;
  const rows = [{ id, token, seat, savedAt: now }, ...recoveredRoomSeats(storage, now).filter(r => r.id !== id)].slice(0, 10);
  try { storage?.setItem(KEY, JSON.stringify(rows)); } catch { /* In-memory/session seats still work without persistent storage. */ }
}
export function forgetRoomSeat(id, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY, JSON.stringify(recoveredRoomSeats(storage).filter(r => r.id !== id))); } catch {}
}
export function markRoomLocation(id, loc = globalThis.location, history = globalThis.history) {
  if (!loc || !history) return;
  const url = new URL(loc.href); url.searchParams.delete('room');
  if (ROOM.test(id ?? '')) url.searchParams.set('room', id);
  history.replaceState(null, '', url.toString());
}
