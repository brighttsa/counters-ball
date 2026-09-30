import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, joinRoom, publicRoom, renameSeat, seatFor, setReady, touch, PRESENCE_MS } from '../match-server/src/live-match-room-rules.js';
import { connectLiveRoomSocket, createLiveRoom, joinLiveRoom, roomApiBase, roomLink, roomSocketBase, setLiveRoomName, setLiveRoomReady } from '../src/core/live-match-room-transport.js';

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

test('players can rename only their own occupied seat', () => {
  const room = createRoom({ levelId: 'kiosk', homeName: 'Ama', now: 100 });
  joinRoom(room, { name: 'Kofi', now: 200 });
  assert.deepEqual(renameSeat(room, 'away', ' Ko\u0000fi  Jr ', 300), { ok: true });
  assert.equal(room.seats.away.name, 'Kofi Jr');
  assert.equal(renameSeat(room, 'spectator', 'Yaw').status, 404);
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
    return { ok: true, status: 200, json: async () => ({ id: 'abcdefghij', token: 'secret-home', room: { phase: 'lobby' } }) };
  };
  assert.equal(roomApiBase({ hostname: 'localhost' }), 'http://localhost:8787');
  assert.equal(roomLink('https://konk.world/', 'abcdefghij'), 'https://konk.world/?room=abcdefghij');
  await createLiveRoom('https://api', { levelId: 'kiosk', homeName: 'Ama' }, fake);
  await joinLiveRoom('https://api', 'abcdefghij', 'Kofi', fake);
  await setLiveRoomReady('https://api', 'abcdefghij', 'away', true, fake);
  await setLiveRoomName('https://api', 'abcdefghij', 'Kofi Two', fake);
  assert.deepEqual(calls.map(([url, method, body]) => [url, method, body]), [
    ['https://api/rooms', 'POST', { levelId: 'kiosk', homeName: 'Ama' }],
    ['https://api/rooms/abcdefghij/join', 'POST', { name: 'Kofi' }],
    ['https://api/rooms/abcdefghij/ready', 'POST', { seat: 'away', ready: true, token: 'secret-home' }],
    ['https://api/rooms/abcdefghij/name', 'POST', { name: 'Kofi Two', token: 'secret-home' }],
  ]);
});

test('each seat gets its own secret token and only that token acts for the seat', () => {
  const room = createRoom({ levelId: 'kiosk', homeName: 'Ama' });
  joinRoom(room, { name: 'Kofi' });
  const { home, away } = room.seats;
  assert.match(home.token, /^[0-9a-f]{36}$/);
  assert.notEqual(home.token, away.token);
  assert.equal(seatFor(room, home.token), 'home');
  assert.equal(seatFor(room, away.token), 'away');
  assert.equal(seatFor(room, 'guess'), null);
  assert.equal(seatFor(room, undefined), null);
  assert.equal('token' in publicRoom(room).seats.home, false);
});

test('reclaiming an abandoned seat revokes the old token', () => {
  const room = createRoom({ levelId: 'kiosk', homeName: 'Ama', now: 100 });
  joinRoom(room, { name: 'Kofi', now: 200 });
  const old = room.seats.away.token;
  joinRoom(room, { name: 'Yaw', now: 200 + PRESENCE_MS + 1 });
  assert.equal(seatFor(room, old), null);
});

test('browser transport proves the seat with the token it was given', async () => {
  const calls = [];
  const fake = async (url, init) => {
    calls.push(JSON.parse(init.body));
    return { ok: true, status: 200, json: async () => ({ id: 'qrstuvwxyz', token: 'secret-home', room: { phase: 'lobby' } }) };
  };
  await createLiveRoom('https://api', { levelId: 'kiosk', homeName: 'Ama' }, fake);
  await setLiveRoomReady('https://api', 'qrstuvwxyz', 'home', true, fake);
  assert.equal(calls.at(-1).token, 'secret-home');
});

test('live room socket authenticates with the seat token and reconnects using the secure URL', async () => {
  const id = 'qrstuvwxyz';
  await createLiveRoom('https://api', { levelId: 'kiosk', homeName: 'Ama' }, async () => ({
    ok: true, status: 201, json: async () => ({ id, token: 'secret-home' }),
  }));
  assert.equal(roomSocketBase('https://api/path'), 'wss://api');
  assert.equal(roomSocketBase('http://localhost:8787'), 'ws://localhost:8787');
  const states = [];
  let deliver;
  class FakeSocket {
    static OPEN = 1;
    readyState = 0;
    listeners = {};
    sent = [];
    constructor(url) { this.url = url; deliver = (type, event = {}) => this.listeners[type]?.(event); FakeSocket.last = this; }
    addEventListener(type, listener) { this.listeners[type] = listener; }
    send(value) { this.sent.push(value); }
    close() { this.readyState = 3; this.listeners.close?.(); }
  }
  const socket = connectLiveRoomSocket('https://api', id, () => {}, (connected) => states.push(connected), FakeSocket);
  assert.equal(FakeSocket.last.url, `wss://api/rooms/${id}/socket`);
  FakeSocket.last.readyState = FakeSocket.OPEN;
  deliver('open');
  assert.deepEqual(JSON.parse(FakeSocket.last.sent[0]), { type: 'auth', token: 'secret-home' });
  assert.equal(socket.connected, true);
  socket.close();
  assert.equal(socket.connected, false);
  assert.deepEqual(states, [true, false]);
});
