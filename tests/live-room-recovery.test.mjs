import test from 'node:test';
import assert from 'node:assert/strict';
import { recoveredRoomSeats, rememberRoomSeat, markRoomLocation } from '../src/core/live-room-seat-recovery.js';
import { createRoom, joinRoom, setReady, PRESENCE_MS } from '../match-server/src/live-match-room-rules.js';
import { handleLiveRoomSocketMessage, broadcastLiveRoom } from '../match-server/src/live-room-websocket-session.js';
import { duelRoomTurn } from '../match-server/src/live-duel-room-turns.js';

test('local seat recovery is bounded, expires and rejects malformed credentials', () => {
  const storage = { getItem: () => storage.value, setItem: (_, value) => { storage.value = value; } };
  const now = Date.now();
  for (const char of 'abcdefghjkmn') rememberRoomSeat(char.repeat(10), 'a'.repeat(36), 'home', storage, now);
  assert.equal(recoveredRoomSeats(storage, now).length, 10);
  assert.equal(recoveredRoomSeats(storage, now + 31 * 86400000).length, 0);
  storage.value = '[null]'; assert.deepEqual(recoveredRoomSeats(storage, now), []);
  const history = { replaceState: (_, __, url) => { history.url = url; } };
  markRoomLocation('abcdefghij', { href: 'https://konk.world/?preview=1' }, history);
  assert.equal(history.url, 'https://konk.world/?preview=1&room=abcdefghij');
});
test('ready and playing seats cannot be reclaimed even when presence expires', () => {
  const room = createRoom({ levelId: 'schoolyard', homeName: 'Ama', now: 100 });
  joinRoom(room, { name: 'Kofi', now: 200 }); setReady(room, 'home', true, 300); setReady(room, 'away', true, 300);
  const token = room.seats.away.token;
  assert.equal(joinRoom(room, { name: 'Yaw', now: 300 + PRESENCE_MS + 1 }).status, 409);
  room.phase = 'playing'; assert.equal(joinRoom(room, { name: 'Yaw', now: 300 + PRESENCE_MS + 1 }).status, 409);
  assert.equal(room.seats.away.token, token);
});
test('replaced lobby sockets lose both heartbeat and broadcast access', async () => {
  const room = createRoom({ levelId: 'schoolyard', homeName: 'Ama', now: 100 });
  joinRoom(room, { name: 'Kofi', now: 200 });
  let attachment; const sent = [];
  const socket = { serializeAttachment: value => { attachment = value; }, deserializeAttachment: () => attachment,
    send: raw => sent.push(raw), close: code => { socket.closed = code; } };
  const ctx = { storage: { get: async key => key === 'room' ? room : null, put: async () => {} }, getWebSockets: () => [socket] };
  await handleLiveRoomSocketMessage(ctx, socket, JSON.stringify({ type: 'auth', token: room.seats.away.token }));
  joinRoom(room, { name: 'Yaw', now: 200 + PRESENCE_MS + 1 }); const count = sent.length;
  broadcastLiveRoom(ctx, room); assert.equal(sent.length, count); assert.equal(socket.closed, 1008);
  await handleLiveRoomSocketMessage(ctx, socket, JSON.stringify({ type: 'heartbeat' })); assert.equal(socket.closed, 1008);
});
test('duel snapshots require an occupied seat token', async () => {
  const room = createRoom({ levelId: 'schoolyard', homeName: 'Ama' });
  const ctx = { storage: { get: async () => ({ k: 1 }) } };
  assert.equal((await duelRoomTurn(ctx, new Request('https://match/room/turn'), room)).status, 403);
  assert.equal((await duelRoomTurn(ctx, new Request('https://match/room/turn', { headers: { Authorization: `Bearer ${room.seats.home.token}` } }), room)).status, 200);
});
