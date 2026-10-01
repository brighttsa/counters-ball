import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, joinRoom, publicRoom, renameSeat, seatFor, setReady, touch, PRESENCE_MS } from '../match-server/src/live-match-room-rules.js';
import { connectLiveRoomSocket, createLiveRoom, joinLiveRoom, readLiveRoomTurn, roomApiBase, roomLink, roomSocketBase, setLiveRoomName, setLiveRoomReady } from '../src/core/live-match-room-transport.js';
import { createLiveMatchRoomFlow } from '../src/ui/live-match-room-flow.js';
import { STREET_LEGENDS_ACTS } from '../src/levels/street-legends-acts-and-unlocks.js';
import { createMessageMatchFlow } from '../src/ui/message-match-flow.js';
import { startLiveRoomGameSync } from '../src/ui/live-match-room-game-sync.js';
import { packLetter } from '../src/core/message-match-turn-letter-codec.js';

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

test('a tournament turn read proves its seat without putting the token in the URL', async () => {
  const id = 'tournament';
  await createLiveRoom('https://api', { levelId: 'schoolyard', mode: 'tournament' }, async () => ({
    ok: true, status: 201, json: async () => ({ id, seat: 'p1', token: 'seat-secret' }),
  }));
  let request;
  await readLiveRoomTurn('https://api', id, async (url, init) => {
    request = { url, init };
    return { ok: true, status: 200, json: async () => ({ letter: { k: 1 } }) };
  }, 'semi-a');
  assert.equal(request.url, 'https://api/rooms/tournament/turn?matchId=semi-a');
  assert.equal(request.init.headers.Authorization, 'Bearer seat-secret');
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
  assert.equal(socket.connected, false);
  deliver('message', { data: JSON.stringify({ type: 'room', room: {} }) });
  assert.equal(socket.connected, true);
  socket.close();
  assert.equal(socket.connected, false);
  assert.deepEqual(states, [true, false]);
});

test('challenger enters the host venue and starts the host act at kickoff', async () => {
  const saved = { document: globalThis.document, location: globalThis.location, fetch: globalThis.fetch };
  const fields = new Map();
  const element = (key) => {
    if (!fields.has(key)) fields.set(key, { value: '', textContent: '', hidden: false, disabled: false,
      readOnly: false, addEventListener() {}, setAttribute() {}, closest() { return this; }, classList: { toggle() {} } });
    return fields.get(key);
  };
  const hostLevel = STREET_LEGENDS_ACTS.find((act) => act.backdrop === 'kiosk');
  const room = { phase: 'ready', levelId: hostLevel.id,
    seats: { home: { name: 'Ama', ready: true, online: true }, away: { name: 'Kofi', ready: true, online: true } } };
  const starts = [];
  try {
    globalThis.document = { getElementById: element, querySelector: element, querySelectorAll: () => [], body: { dataset: {} } };
    globalThis.location = { hostname: 'localhost', href: 'http://localhost:4181/play/' };
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ seat: 'away', token: 'away-token', room }) });
    const flow = createLiveMatchRoomFlow({ level: STREET_LEGENDS_ACTS[0], baseUrl: 'https://konk.world/',
      showTitle() {}, onStart: (...args) => starts.push(args) });
    flow.show();
    element('live-room-code').value = 'abcdefghij';
    await flow.join();
    assert.equal(element('live-room-venue').textContent, hostLevel.name);
    assert.equal(starts.length, 1);
    assert.equal(starts[0][3].id, hostLevel.id);
  } finally {
    globalThis.document = saved.document;
    globalThis.location = saved.location;
    globalThis.fetch = saved.fetch;
  }
});

test('both live seats open the same act and home takes the first turn', async () => {
  const saved = globalThis.document;
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({ error: 'match has not started' }) });
  const level = STREET_LEGENDS_ACTS.find((act) => act.backdrop === 'kiosk');
  const names = { home: 'Ama', away: 'Kofi' };
  const opened = [];
  globalThis.document = { getElementById: () => ({}) };
  try {
    for (const side of ['home', 'away']) {
      const app = { session: null };
      const flow = createMessageMatchFlow({ app, baseUrl: 'https://konk.world/',
        openMatchTable(table, options) {
          opened.push({ side, table, options });
          app.session = { rules: { on() {} }, flick() {}, start(first) { this.first = first; } };
        },
        menus: { show() {} }, hud: { setLocalPerspective() {}, show() {}, event() {} },
        sound: { whistle() {} }, cameraDirector: { setMode() {} }, showTitle() {} });
      await flow.startRoom(level, 'abcdefghij', side, names);
      assert.equal(app.session.first, 'home');
      flow.home();
    }
    assert.deepEqual(opened.map(({ table }) => table.id), [level.id, level.id]);
    assert.deepEqual(opened.map(({ options, side }) => options.controllers[side]), ['human', 'human']);
  } finally { globalThis.document = saved; globalThis.fetch = savedFetch; }
});

test('a connected challenger catches a missed turn once and rejects another venue', async () => {
  const levelId = STREET_LEGENDS_ACTS[0].id;
  const rules = (turn, used) => ({ phase: 'aiming', turn, scores: { home: 0, away: 0 },
    flicksUsed: { home: used, away: 0 }, lastScorer: null, tiebreak: null, tiebreakBonus: { home: 0, away: 0 } });
  const packed = packLetter({ levelId, names: { home: 'Ama', away: 'Kofi' }, seq: 1, by: 'home',
    before: [0, 0, 1, 0], rulesBefore: rules('home', 0), rulesAfter: rules('away', 1),
    flicks: [{ entry: 0, vx: 1, vy: 0, after: [0.1, 0, 1, 0] }] });
  const played = [];
  let message;
  let state;
  const sync = startLiveRoomGameSync({ api: 'https://api', id: 'abcdefghij', mySide: 'away',
    letters: { levelId, replay: async (letter) => played.push(letter.seq) }, hud: { event() {} },
    readTurn: async () => ({ letter: packed }),
    socketFactory: (_api, _id, onMessage, onState) => {
      message = onMessage; state = onState;
      return { connected: true, close() {} };
    } });
  try {
    await new Promise(setImmediate);
    state(true);
    message({ type: 'turn', letter: packed });
    message({ type: 'turn', letter: { ...packed, k: 2, l: 'another-venue' } });
    await new Promise(setImmediate);
    assert.deepEqual(played, [1]);
  } finally { sync.close(); }
});
