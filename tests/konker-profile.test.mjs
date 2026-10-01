import test from 'node:test';
import assert from 'node:assert/strict';
import { handleKonkerProfile, routeKonkerProfiles } from '../match-server/src/konker-profile-service.js';
import { accessKonkerProfile, newKonkerProfileCredentials, parseProfileRecoveryCode, savedKonkerProfile, storeKonkerProfile } from '../src/core/konker-profile-transport.js';

const credentials = { id: 'a'.repeat(32), secret: 'b'.repeat(64) };
function fixture() {
  const rows = new Map();
  const ctx = { storage: { get: async key => rows.get(key), put: async (key, value) => rows.set(key, value) } };
  const request = (method, name, secret = credentials.secret, id = credentials.id) => new Request('https://match/player', {
    method, headers: { Authorization: `Bearer ${secret}` }, ...(method === 'POST' ? { body: JSON.stringify({ id, name }) } : {}),
  });
  return { rows, ctx, request };
}
test('profile creation is retryable, recoverable and stores only the secret hash on the server', async () => {
  const { ctx, rows, request } = fixture();
  assert.equal((await handleKonkerProfile(ctx, request('GET'))).status, 404);
  const created = await handleKonkerProfile(ctx, request('POST', ' Ama '), 100);
  assert.equal(created.status, 201);
  assert.deepEqual((await created.json()).profile, { id: credentials.id, name: 'Ama', createdAt: 100, updatedAt: 100 });
  assert.ok(!JSON.stringify(rows.get('konker-profile')).includes(credentials.secret));
  assert.equal((await handleKonkerProfile(ctx, request('POST', 'Ama'), 101)).status, 200);
  assert.equal((await handleKonkerProfile(ctx, request('GET'))).status, 200);
  assert.equal((await handleKonkerProfile(ctx, request('GET', undefined, 'c'.repeat(64)))).status, 403);
  assert.equal((await handleKonkerProfile(ctx, request('POST', 'Kofi', credentials.secret, 'd'.repeat(32)))).status, 409);
});
test('profile transport uses private Authorization headers and supports code restore', async () => {
  const { ctx } = fixture(); const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return handleKonkerProfile(ctx, new Request(url, init)); };
  const profile = await accessKonkerProfile('https://api', credentials, 'Bright', fetchImpl);
  assert.equal((await accessKonkerProfile('https://api', parseProfileRecoveryCode(`${credentials.id}.${credentials.secret}`), undefined, fetchImpl)).name, 'Bright');
  assert.ok(calls.every(({ url, init }) => !url.includes(credentials.secret) && !init.body?.includes(credentials.secret)));
  const storage = { getItem: () => storage.value, setItem: (_, value) => { storage.value = value; } };
  storeKonkerProfile(profile, storage); assert.deepEqual(savedKonkerProfile(storage), profile);
  assert.equal(parseProfileRecoveryCode('invalid'), null);
  const fresh = newKonkerProfileCredentials(); assert.ok(parseProfileRecoveryCode(`${fresh.id}.${fresh.secret}`));
});
test('profile routes reject wrong origins and mismatched IDs before accessing storage', async () => {
  const env = { ALLOWED_ORIGINS: 'https://konk.world', KONK_MATCH: { idFromName() { throw Error('Must not access storage'); } } };
  const url = `https://api/players/${credentials.id}`;
  assert.equal((await routeKonkerProfiles(new Request(url), env)).status, 403);
  assert.equal((await routeKonkerProfiles(new Request(url, { method: 'POST', headers: { Origin: 'https://konk.world' }, body: JSON.stringify({ id: 'd'.repeat(32), name: 'Ama' }) }), env)).status, 409);
});
