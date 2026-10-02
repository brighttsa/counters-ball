import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveRoom, leaveTableTalk, renewTableTalkLease, requestTableTalkJoin } from '../src/core/live-match-room-transport.js';

test('Table Talk endpoints prove the stored room seat and bind renew and leave to its session id', async () => {
  const calls = [];
  const fakeFetch = async (url, init = {}) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ id: 'abcdefghij', seat: 'home', token: 'a'.repeat(36), sessionId: '12345678-1234-4234-8234-123456789abc' }) };
  };
  await createLiveRoom('https://api', { levelId: 'schoolyard', homeName: 'Ama' }, fakeFetch);
  await requestTableTalkJoin('https://api', 'abcdefghij', fakeFetch);
  await renewTableTalkLease('https://api', 'abcdefghij', '12345678-1234-4234-8234-123456789abc', fakeFetch);
  await leaveTableTalk('https://api', 'abcdefghij', '12345678-1234-4234-8234-123456789abc', fakeFetch);
  assert.deepEqual(calls.map(call => new URL(call.url).pathname), [
    '/rooms', '/rooms/abcdefghij/voice/join', '/rooms/abcdefghij/voice/renew', '/rooms/abcdefghij/voice/leave',
  ]);
  for (const call of calls.slice(1)) assert.equal(call.init.headers.Authorization, `Bearer ${'a'.repeat(36)}`);
  assert.deepEqual(JSON.parse(calls[2].init.body), { sessionId: '12345678-1234-4234-8234-123456789abc' });
  assert.deepEqual(JSON.parse(calls[3].init.body), { sessionId: '12345678-1234-4234-8234-123456789abc' });
});
