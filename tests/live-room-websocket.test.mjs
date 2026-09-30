import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, joinRoom } from '../match-server/src/live-match-room-rules.js';
import { broadcastLiveRoom, handleLiveRoomSocketMessage } from '../match-server/src/live-room-websocket-session.js';

function setup() {
  const room = createRoom({ levelId: 'kiosk', homeName: 'Ama', now: 100 });
  joinRoom(room, { name: 'Kofi', now: 101 });
  const values = new Map([['room', room], ['room:letter', { k: 2, by: 'h' }]]);
  const sockets = [];
  const ctx = {
    storage: {
      get: async (key) => values.get(key),
      put: async (key, value) => values.set(key, value),
    },
    getWebSockets: () => sockets,
  };
  const socket = () => {
    const sent = [];
    let attachment = null;
    const ws = {
      sent,
      closed: null,
      serializeAttachment(value) { attachment = structuredClone(value); },
      deserializeAttachment() { return attachment; },
      send(value) { sent.push(JSON.parse(value)); },
      close(code, reason) { this.closed = [code, reason]; },
    };
    sockets.push(ws);
    return ws;
  };
  return { ctx, room, values, socket };
}

test('socket auth returns public room state and the latest accepted turn', async () => {
  const { ctx, room, socket } = setup();
  const ws = socket();
  await handleLiveRoomSocketMessage(ctx, ws, JSON.stringify({ type: 'auth', token: room.seats.home.token }));
  assert.equal(ws.closed, null);
  assert.deepEqual(ws.sent.map(({ type }) => type), ['room', 'turn']);
  assert.equal(ws.sent[0].room.seats.home.name, 'Ama');
  assert.equal(ws.sent[0].room.seats.home.token, undefined);
  assert.deepEqual(ws.sent[1].letter, { k: 2, by: 'h' });
});

test('invalid socket credentials are closed and unauthenticated sockets receive no broadcasts', async () => {
  const { ctx, room, socket } = setup();
  const bad = socket();
  await handleLiveRoomSocketMessage(ctx, bad, JSON.stringify({ type: 'auth', token: 'wrong' }));
  assert.deepEqual(bad.closed, [1008, 'Invalid seat']);
  const good = socket();
  await handleLiveRoomSocketMessage(ctx, good, JSON.stringify({ type: 'auth', token: room.seats.away.token }));
  const before = bad.sent.length;
  broadcastLiveRoom(ctx, room, { type: 'turn', letter: { k: 3 } });
  assert.equal(bad.sent.length, before);
  assert.equal(good.sent.at(-1).letter.k, 3);
});

test('authenticated heartbeat updates seat presence and broadcasts current state', async () => {
  const { ctx, room, socket } = setup();
  const ws = socket();
  await handleLiveRoomSocketMessage(ctx, ws, JSON.stringify({ type: 'auth', token: room.seats.home.token }));
  await handleLiveRoomSocketMessage(ctx, ws, JSON.stringify({ type: 'heartbeat' }));
  assert.ok(room.seats.home.seenAt >= 100);
  assert.equal(ws.sent.at(-1).type, 'room');
});
