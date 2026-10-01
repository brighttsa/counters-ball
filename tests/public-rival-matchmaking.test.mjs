import test from 'node:test';
import assert from 'node:assert/strict';
import { handlePublicMatchmaking, routePublicMatchmaking, SEARCH_LEASE_MS } from '../match-server/src/public-rival-matchmaking-service.js';
import { joinRoom, seatFor, setReady } from '../match-server/src/live-match-room-rules.js';

const ticket = n => n.toString(16).padStart(36, '0');
function fixture() {
  const data = new Map(), rooms = new Map();
  const ctx = { storage: { get: async key => structuredClone(data.get(key)),
    put: async (key, value) => data.set(key, structuredClone(value)), setAlarm: async () => {} } };
  const env = { KONK_MATCH: { idFromName: id => id, get: id => ({ fetch: async (_, init) => {
    rooms.set(id, JSON.parse(init.body).room); return new Response('{}', { status: 201 });
  } }) } };
  const call = async (n, action = 'join', now = 1000) => {
    const response = await handlePublicMatchmaking(ctx, env, { ticket: ticket(n), action, name: `Rival ${n}` }, now);
    return { status: response.status, ...await response.json() };
  };
  return { call, data, rooms, ctx, env };
}

test('two real searches receive one venue, separate authenticated seats and ready-up', async () => {
  const f = fixture();
  assert.equal((await f.call(1)).state, 'waiting');
  const away = await f.call(2), home = await f.call(1, 'poll');
  assert.equal(away.id, home.id); assert.equal(f.rooms.size, 1);
  assert.equal(away.room.levelId, 'schoolyard'); assert.equal(home.seat, 'home');
  assert.equal(away.seat, 'away'); assert.notEqual(home.token, away.token);
  const room = f.rooms.get(home.id);
  assert.equal(seatFor(room, home.token), 'home');
  assert.equal(seatFor(room, away.token), 'away');
  assert.equal(JSON.stringify(home.room).includes(home.token), false);
  setReady(room, 'home', true); setReady(room, 'away', true);
  assert.equal(room.phase, 'ready');
  assert.equal(joinRoom(room, { name: 'Intruder', now: 999999 }).ok, false);
});
test('retry and cancellation after assignment recover the same match without pairing twice', async () => {
  const f = fixture(); await f.call(1); const away = await f.call(2);
  assert.equal((await f.call(2)).id, away.id);
  assert.equal((await f.call(1, 'cancel')).id, away.id);
  assert.equal(f.rooms.size, 1);
});
test('cancel removes eligibility and prevents a delayed join from restarting the search', async () => {
  const f = fixture(); await f.call(1); await f.call(1, 'cancel');
  assert.equal((await f.call(1)).state, 'cancelled');
  assert.equal((await f.call(2)).state, 'waiting'); assert.equal(f.rooms.size, 0);
  await f.call(3, 'cancel'); assert.equal((await f.call(3)).state, 'cancelled');
});
test('dead search leases expire, but polling renews a live search', async () => {
  const f = fixture(); await f.call(1);
  assert.equal((await f.call(1, 'poll', 19000)).state, 'waiting');
  assert.equal((await f.call(1, 'poll', 19000 + SEARCH_LEASE_MS)).state, 'expired');
  assert.equal((await f.call(2, 'join', 50000)).state, 'waiting');
});
test('FIFO selection leaves the third player waiting, never double-books a rival', async () => {
  const f = fixture(); await f.call(1); await f.call(2); await f.call(3);
  assert.equal((await f.call(3, 'poll')).state, 'waiting'); assert.equal(f.rooms.size, 1);
});
test('bad tickets and actions are rejected without allocating queue state', async () => {
  const f = fixture();
  assert.equal((await handlePublicMatchmaking(f.ctx, f.env, { ticket: 'bad', action: 'join' })).status, 400);
  assert.equal((await handlePublicMatchmaking(f.ctx, f.env, { ticket: ticket(1), action: 'ranked' })).status, 400);
  assert.equal(f.data.size, 0);
});
test('public endpoint rejects wrong origins, methods and oversized JSON', async () => {
  const env = { ALLOWED_ORIGINS: 'http://localhost:4181' };
  assert.equal((await routePublicMatchmaking(new Request('https://match/matchmaking'), env)).status, 405);
  assert.equal((await routePublicMatchmaking(new Request('https://match/matchmaking', { method: 'POST', body: '{}' }), env)).status, 403);
  const request = body => new Request('https://match/matchmaking', { method: 'POST', headers: { Origin: 'http://localhost:4181' }, body });
  assert.equal((await routePublicMatchmaking(request('x'.repeat(1025)), env)).status, 413);
  assert.equal((await routePublicMatchmaking(request('not-json'), env)).status, 400);
});

test('a burst of new search tickets is bounded and recovers after the rate window', async () => {
  const f = fixture();
  for (let n = 1; n <= 20; n++) assert.equal((await f.call(n)).status, 200);
  assert.equal((await f.call(21)).status, 429);
  assert.equal((await f.call(21, 'join', 62000)).status, 200);
});
test('failed room installation never reports a match or consumes the waiting rival', async () => {
  const f = fixture(); await f.call(1);
  f.env.KONK_MATCH.get = () => ({ fetch: async () => new Response('{}', { status: 503 }) });
  assert.equal((await f.call(2)).status, 503);
  assert.equal(f.data.get('public-searches')[ticket(1)].state, 'waiting');
});
