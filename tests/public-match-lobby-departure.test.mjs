import test from 'node:test';
import assert from 'node:assert/strict';
import { leavePublicMatchLobby } from '../match-server/src/public-match-lobby-departure.js';
import { createRoom, joinRoom, setReady } from '../match-server/src/live-match-room-rules.js';

function fixture() {
  const room = createRoom({ levelId: 'schoolyard' }); joinRoom(room, { name: 'Rival' }); room.matchmaking = true;
  const ctx = { storage: { async get() { return room; }, async put() {} }, getWebSockets: () => [] };
  const request = token => new Request('https://match/room/leave', { method: 'POST', body: JSON.stringify({ token }) });
  return { room, ctx, request };
}
test('departure cancels the pairing and prevents kickoff', async () => {
  const { room, ctx, request } = fixture(); setReady(room, 'home', true);
  assert.equal((await leavePublicMatchLobby(ctx, request(room.seats.away.token))).status, 200);
  assert.equal(room.phase, 'cancelled'); assert.equal(room.seats.home.ready, false);
  assert.equal(setReady(room, 'home', true).ok, false);
  assert.equal((await leavePublicMatchLobby(ctx, request(room.seats.away.token))).status, 200);
});
test('strangers and started matches cannot cancel a pairing', async () => {
  const { room, ctx, request } = fixture();
  assert.equal((await leavePublicMatchLobby(ctx, request('wrong'))).status, 403);
  setReady(room, 'home', true); setReady(room, 'away', true);
  assert.equal((await leavePublicMatchLobby(ctx, request(room.seats.home.token))).status, 409);
  assert.equal(room.phase, 'ready');
});
