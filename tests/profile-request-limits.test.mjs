import test from 'node:test';
import assert from 'node:assert/strict';
import { limitProfileRequest } from '../match-server/src/profile-request-limits.js';
test('profile access limits expire and never store raw network addresses', async () => {
  const rows = new Map(); const alarms = [];
  const ctx = { storage: { get: async key => rows.get(key), put: async (key, value) => rows.set(key, value), setAlarm: async t => alarms.push(t) } };
  for (let i = 0; i < 30; i++) assert.equal((await limitProfileRequest(ctx, 'a'.repeat(64), 100)).status, 200);
  assert.equal((await limitProfileRequest(ctx, 'a'.repeat(64), 101)).status, 429);
  assert.equal((await limitProfileRequest(ctx, 'a'.repeat(64), 60100)).status, 200);
  assert.equal((await limitProfileRequest(ctx, '1.2.3.4', 60100)).status, 400);
  assert.ok(alarms.length); assert.equal(Object.keys(rows.get('profile-request-limits')).length, 1);
});
