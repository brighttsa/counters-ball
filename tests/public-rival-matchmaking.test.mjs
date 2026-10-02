import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { publicRivalSearchStorage } from '../match-server/src/public-rival-search-storage.js';
import { handlePublicMatchmaking, routePublicMatchmaking, SEARCH_LEASE_MS } from '../match-server/src/public-rival-matchmaking-service.js';
import { joinRoom, seatFor, setReady } from '../match-server/src/live-match-room-rules.js';

const ticket = n => n.toString(16).padStart(36, '0');
function fixture() {
  const data = new Map(), rooms = new Map();
  const db = new DatabaseSync(':memory:'); let alarm = null;
  const ctx = { storage: { get: async key => structuredClone(data.get(key)),
    put: async (key, value) => data.set(key, structuredClone(value)),
    delete: async keys => (Array.isArray(keys) ? keys : [keys]).forEach(key => data.delete(key)),
    getAlarm: async () => alarm, setAlarm: async time => { alarm = time; },
    transactionSync: fn => { db.exec('BEGIN'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } },
    sql: { exec(query, ...params) { const statement = db.prepare(query); return statement.columns().length ? statement.all(...params) : (statement.run(...params), []); } },
  } };
  const env = { KONK_MATCH: { idFromName: id => id, get: id => ({ fetch: async (_, init) => {
    rooms.set(id, JSON.parse(init.body).room); return new Response('{}', { status: 201 });
  } }) } };
  const call = async (n, action = 'join', now = 1000, client = 'local') => {
    const response = await handlePublicMatchmaking(ctx, env, { ticket: ticket(n), action, name: `Rival ${n}` }, now, client);
    return { status: response.status, ...await response.json() };
  };
  return { call, data, rooms, ctx, env, db, alarm: () => alarm };
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
  assert.equal((await publicRivalSearchStorage(f.ctx)).get(ticket(1), 1000).state, 'waiting');
});

test('1200 distinct players pair without the old search or client ceilings', async () => {
  const f = fixture();
  for (let n = 1; n <= 1200; n++) {
    const result = await f.call(n, 'join', 1000, `client-${n}`);
    assert.equal(result.status, 200);
    assert.equal(result.state, n % 2 ? 'waiting' : 'matched');
  }
  assert.equal(f.rooms.size, 600);
  for (let n = 1; n <= 1200; n++) assert.equal((await f.call(n, 'poll', 1001, `client-${n}`)).state, 'matched');
});

test('more than 100 waiting searches remain admitted during room-installation recovery', async () => {
  const f = fixture(), install = f.env.KONK_MATCH.get;
  f.env.KONK_MATCH.get = () => ({ fetch: async () => new Response('{}', { status: 503 }) });
  await f.call(1, 'join', 1000, 'client-1');
  for (let n = 2; n <= 150; n++) assert.equal((await f.call(n, 'join', 1000, `client-${n}`)).status, 503);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS total FROM rival_searches WHERE state = 'waiting'").get().total, 150);
  f.env.KONK_MATCH.get = install;
  for (let n = 1; n <= 150; n++) assert.equal((await f.call(n, 'poll', 1001, `client-${n}`)).state, 'matched');
  assert.equal(f.rooms.size, 75);
});

test('existing search tickets, results and abuse counters survive indexed-storage migration', async () => {
  const f = fixture();
  f.data.set('public-searches', { [ticket(1)]: { state: 'waiting', name: 'Existing', joinedAt: 999, expiresAt: 20000 },
    [ticket(3)]: { state: 'cancelled', expiresAt: 20000 } });
  f.data.set('public-search-limits', { blocked: { requests: 240, joins: 0, until: 20000 } });
  assert.equal((await f.call(4, 'join', 1000, 'blocked')).status, 429);
  assert.equal((await f.call(3, 'join', 1000, 'new')).state, 'cancelled');
  const away = await f.call(2), home = await f.call(1, 'poll');
  assert.equal(home.id, away.id);
  assert.equal(f.data.has('public-searches'), false);
});

test('cleanup expires individual records without removing live searches or postponing alarms', async () => {
  const f = fixture(); await f.call(1, 'join', 1000, 'a');
  const initialAlarm = f.alarm();
  await f.call(1, 'poll', 19000, 'a');
  assert.equal(f.alarm(), initialAlarm);
  const store = await publicRivalSearchStorage(f.ctx);
  store.put(ticket(2), { state: 'cancelled', expiresAt: 20000 });
  await store.cleanup(21000);
  assert.equal(store.get(ticket(2), 21000), undefined);
  assert.equal(store.get(ticket(1), 21000).state, 'waiting');
  assert.equal(f.alarm(), 39000);
});
