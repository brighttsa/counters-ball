import test from 'node:test';
import assert from 'node:assert/strict';
import { newSearchTicket, loadSearchTicket, saveSearchTicket, searchForRival } from '../src/core/public-rival-matchmaking-transport.js';

test('search recovery uses a strong opaque ticket, removable without affecting game saves', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const ticket = newSearchTicket(); assert.match(ticket, /^[a-f0-9]{36}$/);
  assert.notEqual(ticket, newSearchTicket());
  saveSearchTicket(ticket, storage); assert.equal(loadSearchTicket(storage), ticket);
  saveSearchTicket(null, storage); assert.equal(loadSearchTicket(storage), null);
});
test('transport sends ticket in the request body, never in a shareable URL', async () => {
  const result = await searchForRival('https://match', { action: 'join', ticket: 'secret', name: 'Bright' }, async (url, init) => {
    assert.equal(url, 'https://match/matchmaking'); assert.equal(init.method, 'POST');
    assert.equal(JSON.parse(init.body).ticket, 'secret');
    return new Response(JSON.stringify({ state: 'waiting' }));
  });
  assert.equal(result.state, 'waiting');
  await assert.rejects(searchForRival('https://match', {}, async () => new Response('{"error":"busy"}', { status: 429 })), { status: 429 });
});
