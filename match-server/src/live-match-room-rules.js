// Pure room rules for the live KONK! lobby. The Durable Object owns the data;
// this module keeps seat, presence and ready-state decisions deterministic.
export const ROOM_ID = /^[a-km-np-zA-HJ-NP-Z2-9]{10}$/;
export const SEATS = ['home', 'away'];
export const PRESENCE_MS = 15_000;

export function cleanRoomName(value, fallback = 'Player') {
  const name = String(value ?? '').replace(/[^\p{L}\p{N} ._'’-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 22);
  return name || fallback;
}

/** A seat's secret: the room code is shared in the invite, so the code alone must not let anyone act for a player. */
export function newSeatToken(random = crypto.getRandomValues.bind(crypto)) {
  return Array.from(random(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Which seat a token belongs to, or null. */
export function seatFor(room, token) {
  if (!room || typeof token !== 'string' || !token) return null;
  return SEATS.find((seat) => room.seats[seat]?.token === token) ?? null;
}

export function newRoom(random = crypto.getRandomValues.bind(crypto)) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(random(new Uint8Array(10)), (b) => alphabet[b % alphabet.length]).join('');
}

export function createRoom({ levelId, homeName, now = Date.now() }) {
  return { phase: 'lobby', levelId: String(levelId ?? '').slice(0, 40), createdAt: now, updatedAt: now,
    seats: { home: { name: cleanRoomName(homeName, 'Player 1'), ready: false, seenAt: now, token: newSeatToken() }, away: null } };
}

export function joinRoom(room, { name, now = Date.now() }) {
  if (!room || room.phase === 'ended') return { ok: false, status: 410, error: 'room is closed' };
  if (room.seats.away && now - room.seats.away.seenAt <= PRESENCE_MS) return { ok: false, status: 409, error: 'room is full' };
  // Reclaiming an abandoned seat issues a new token, so the player who left can no longer act for it.
  room.seats.away = { name: cleanRoomName(name, 'Player 2'), ready: false, seenAt: now, token: newSeatToken() };
  room.updatedAt = now;
  return { ok: true, seat: 'away' };
}

export function setReady(room, seat, ready, now = Date.now()) {
  if (!SEATS.includes(seat) || !room?.seats[seat]) return { ok: false, status: 404, error: 'seat is not taken' };
  room.seats[seat].ready = Boolean(ready);
  room.seats[seat].seenAt = now;
  room.updatedAt = now;
  if (room.seats.home?.ready && room.seats.away?.ready) room.phase = 'ready';
  return { ok: true, phase: room.phase };
}

export function renameSeat(room, seat, name, now = Date.now()) {
  if (!SEATS.includes(seat) || !room?.seats[seat]) return { ok: false, status: 404, error: 'seat is not taken' };
  room.seats[seat].name = cleanRoomName(name, seat === 'home' ? 'Player 1' : 'Player 2');
  room.seats[seat].seenAt = now;
  room.updatedAt = now;
  return { ok: true };
}

export function touch(room, seat, now = Date.now()) {
  if (!SEATS.includes(seat) || !room?.seats[seat]) return { ok: false, status: 404, error: 'seat is not taken' };
  room.seats[seat].seenAt = now;
  room.updatedAt = now;
  return { ok: true };
}

export function publicRoom(room, now = Date.now()) {
  if (!room) return null;
  const seats = Object.fromEntries(SEATS.map((seat) => {
    const player = room.seats[seat];
    return [seat, player && { name: player.name, ready: player.ready, online: now - player.seenAt <= PRESENCE_MS }];
  }));
  return { phase: room.phase, levelId: room.levelId, seats, updatedAt: room.updatedAt };
}
