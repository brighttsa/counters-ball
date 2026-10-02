import test from 'node:test';
import assert from 'node:assert/strict';
import { bindKonkerSeat, verifyReadyProfile } from '../match-server/src/konker-room-seat-identity.js';
import { readyProfileProof } from '../src/core/konker-room-seat-transport.js';
const id = 'a'.repeat(32), secret = 'b'.repeat(64);
const request = () => new Request('https://api/rooms/abcdefghij/ready', {
  method: 'POST', headers: { Authorization: `Bearer ${secret}` },
});
const room = () => ({ phase: 'lobby', seats: { home: { ready: false }, away: { ready: false } } });

test('guests need no profile proof; forged internal identity is removed', async () => {
  const body = { ready: true, verifiedProfileId: id };
  assert.equal(await verifyReadyProfile(new Request('https://api'), {}, body), null);
  assert.equal(body.verifiedProfileId, undefined);
});
test('profile proof is checked against its credential-owning durable object', async () => {
  const calls = [];
  const env = { KONK_MATCH: { idFromName: name => name, get: name => ({
    fetch: async (url, init) => { calls.push({ name, url, init }); return Response.json({ profile: { id } }); },
  }) } };
  const body = { profileId: id, verifiedProfileId: 'forged' };
  assert.equal(await verifyReadyProfile(request(), env, body), null);
  assert.equal(body.verifiedProfileId, id);
  assert.equal(body.profileId, undefined);
  const proof = calls.find(call => call.name === `player:${id}`);
  assert.ok(proof);
  assert.equal(proof.init.headers.Authorization, `Bearer ${secret}`);
});
test('invalid credentials, malformed IDs and mismatched profile responses cannot bind', async () => {
  const env = { KONK_MATCH: { idFromName: n => n, get: () => ({ fetch: async () => Response.json({ error: 'invalid' }, { status: 403 }) }) } };
  assert.equal((await verifyReadyProfile(request(), env, { profileId: id })).status, 403);
  assert.equal((await verifyReadyProfile(request(), env, { profileId: 'bad' })).status, 400);
  assert.equal((await verifyReadyProfile(new Request('https://api'), env, { profileId: id })).status, 400);
  env.KONK_MATCH.get = () => ({ fetch: async () => Response.json({ profile: { id: 'c'.repeat(32) } }) });
  assert.equal((await verifyReadyProfile(request(), env, { profileId: id })).status, 403);
});
test('identity binds once, is idempotent, and cannot claim both seats', () => {
  const r = room();
  assert.equal(bindKonkerSeat(r, 'home', id).ok, true);
  assert.equal(bindKonkerSeat(r, 'home', id).ok, true);
  assert.equal(bindKonkerSeat(r, 'home', 'c'.repeat(32)).status, 409);
  assert.equal(bindKonkerSeat(r, 'away', id).status, 409);
  assert.equal(r.seats.home.profileId, id);
  assert.equal(r.seats.away.profileId, undefined);
});
test('binding cannot happen after ready-up or kickoff; guests remain usable', () => {
  const r = room(); r.seats.home.ready = true;
  assert.equal(bindKonkerSeat(r, 'home', id).status, 409);
  r.phase = 'playing'; r.seats.home.ready = false;
  assert.equal(bindKonkerSeat(r, 'home', id).status, 409);
  assert.equal(bindKonkerSeat(r, 'home', undefined).ok, true);
  assert.equal(bindKonkerSeat(r, 'unknown', id).status, 403);
});
test('client uses saved credentials only, without adding secrets to JSON', () => {
  const storage = { getItem: () => JSON.stringify({ id, secret, name: 'KONKER' }) };
  assert.deepEqual(readyProfileProof(storage), { body: { profileId: id }, headers: { Authorization: `Bearer ${secret}` } });
  assert.deepEqual(readyProfileProof({ getItem: () => null }), { body: {}, headers: {} });
});
test('profile verification honors rate limits and allowed origins', async () => {
  const env = { ALLOWED_ORIGINS: 'https://konk.world', KONK_MATCH: { idFromName: n => n,
    get: () => ({ fetch: async () => Response.json({ error: 'too many' }, { status: 429 }) }) } };
  assert.equal((await verifyReadyProfile(request(), env, { profileId: id })).status, 429);
  const blocked = new Request(request(), { headers: { Authorization: `Bearer ${secret}`, Origin: 'https://untrusted.test' } });
  assert.equal((await verifyReadyProfile(blocked, env, { profileId: id })).status, 403);
});
