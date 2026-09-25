import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, joinRoom, publicRoom, setReady, touch, PRESENCE_MS } from '../match-server/src/live-match-room-rules.js';
import { createLiveRoom, joinLiveRoom, roomApiBase, roomLink, setLiveRoomReady } from '../src/core/live-match-room-transport.js';

test('live room opens with one seat and no ready state', () => {
  const room = createRoom({ levelId: 'kiosk', homeName: 'Ama', now: 100 });
  assert.equal(room.phase, 'lobby');
  assert.deepEqual(publicRoom(room, 100).seats, {
    home: { name: 'Ama', ready: false, online: true }, away: null,
  });
});

test('a second player joins, both ready, and presence expires', () => {
  const room = createRoom({ levelId: 'kiosk', homeName: 'Ama', now: 100 });
  assert.deepEqual(joinRoom(room, { name: 'Kofi', now: 200 }), { ok: true, seat: 'away' });
  assert.deepEqual(setReady(room, 'home', true, 300), { ok: true, phase: 'lobby' });
  assert.deepEqual(setReady(room, 'away', true, 400), { ok: true, phase: 'ready' });
  assert.equal(publicRoom(room, 400).phase, 'ready');
  assert.equal(publicRoom(room, 400 + PRESENCE_MS + 1).seats.home.online, false);
  assert.equal(touch(room, 'home', 500).ok, true);
  assert.equal(publicRoom(room, 500).seats.home.online, true);
});

test('a live room cannot accept a third player or an unknown seat', () => {
  const room = createRoom({ levelId: 'kiosk', homeName: 'Ama' });
  joinRoom(room, { name: 'Kofi' });
  assert.equal(joinRoom(room, { name: 'Yaw' }).status, 409);
  assert.equal(setReady(room, 'spectator', true).status, 404);
  assert.equal(touch(room, 'spectator').status, 404);
});

test('an abandoned away seat can be reclaimed after presence expires', () => {
  const room = createRoom({ levelId: 'kiosk', homeName: 'Ama', now: 100 });
  joinRoom(room, { name: 'Kofi', now: 200 });
  assert.deepEqual(joinRoom(room, { name: 'Yaw', now: 200 + PRESENCE_MS + 1 }), { ok: true, seat: 'away' });
  assert.equal(room.seats.away.name, 'Yaw');
});

test('browser transport keeps room actions small and addressable', async () => {
  const calls = [];
  const fake = async (url, init) => {
    calls.push([url, init.method, JSON.parse(init.body)]);
    return { ok: true, status: 200, json: async () => ({ room: { phase: 'lobby' } }) };
  };
  assert.equal(roomApiBase({ hostname: 'localhost' }), 'http://localhost:8787');
  assert.equal(roomLink('https://konk.world/', 'abcdefghij'), 'https://konk.world/?room=abcdefghij');
  await createLiveRoom('https://api', { levelId: 'kiosk', homeName: 'Ama' }, fake);
  await joinLiveRoom('https://api', 'abcdefghij', 'Kofi', fake);
  await setLiveRoomReady('https://api', 'abcdefghij', 'away', true, fake);
  assert.deepEqual(calls.map(([url, method, body]) => [url, method, body]), [
    ['https://api/rooms', 'POST', { levelId: 'kiosk', homeName: 'Ama' }],
    ['https://api/rooms/abcdefghij/join', 'POST', { name: 'Kofi' }],
    ['https://api/rooms/abcdefghij/ready', 'POST', { seat: 'away', ready: true }],
  ]);
});
