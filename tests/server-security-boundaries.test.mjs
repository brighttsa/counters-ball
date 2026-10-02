import test from 'node:test';
import assert from 'node:assert/strict';
import { readBoundedText } from '../match-server/src/bounded-request-body.js';
import { CLIENT_CREATION_LIMIT, GLOBAL_CREATION_LIMIT, limitMatchCreation, checkMatchCreationLimit } from '../match-server/src/match-creation-request-limits.js';
import { routeKonkerProfiles } from '../match-server/src/konker-profile-service.js';
import { routePublicMatchmaking } from '../match-server/src/public-rival-matchmaking-service.js';

function fixture() {
  const rows = new Map(), alarms = [];
  return { rows, alarms, ctx: { storage: {
    get: async key => structuredClone(rows.get(key)),
    put: async (key, value) => rows.set(key, structuredClone(value)),
    setAlarm: async time => alarms.push(time),
  } } };
}
function streamed(chunks, headers = {}) {
  let index = 0, cancelled = false;
  const request = new Request('https://api/rooms', { method: 'POST', headers, duplex: 'half',
    body: new ReadableStream({
      pull(controller) { index < chunks.length ? controller.enqueue(chunks[index++]) : controller.close(); },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 }),
  });
  return { request, cancelled: () => cancelled };
}
const bytes = text => new TextEncoder().encode(text);

test('bounded reader preserves UTF-8 across chunks at exact byte limit', async () => {
  const encoded = bytes('YƐ KONKI!');
  assert.equal(await readBoundedText(streamed([encoded.slice(0, 2), encoded.slice(2)]).request, encoded.length), 'YƐ KONKI!');
  assert.equal(await readBoundedText(new Request('https://api'), 1), '');
});
test('bounded reader rejects chunked, multibyte and understated bodies and cancels streams', async () => {
  for (const headers of [{}, { 'Content-Length': '1' }]) {
    const body = streamed([bytes('ƐƐ'), bytes('unread')], headers);
    assert.equal(await readBoundedText(body.request, 3), null);
    assert.equal(body.cancelled(), true);
  }
  const body = streamed([bytes('abc')], { 'Content-Length': '9999' });
  assert.equal(await readBoundedText(body.request, 3), null);
  assert.equal(body.request.bodyUsed, false);
});
test('creation limit permits guests, shares a bounded client budget and expires', async () => {
  const { ctx, rows, alarms } = fixture(), client = 'a'.repeat(64);
  for (let i = 0; i < CLIENT_CREATION_LIMIT; i++) assert.equal((await limitMatchCreation(ctx, client, 100)).status, 200);
  const blocked = await limitMatchCreation(ctx, client, 101);
  assert.equal(blocked.status, 429); assert.equal(blocked.headers.get('Retry-After'), '60');
  assert.equal((await limitMatchCreation(ctx, 'invalid', 101)).status, 400);
  assert.equal((await limitMatchCreation(ctx, client, 60_100)).status, 200);
  assert.equal(rows.get('creation-limits').total, 1);
  assert.equal(alarms.at(-1), 120_100);
});
test('global creation limit bounds rotating-client abuse and storage growth', async () => {
  const { ctx, rows } = fixture();
  for (let i = 0; i < GLOBAL_CREATION_LIMIT; i++) {
    assert.equal((await limitMatchCreation(ctx, i.toString(16).padStart(64, '0'), 100)).status, 200);
  }
  assert.equal((await limitMatchCreation(ctx, 'f'.repeat(64), 100)).status, 429);
  assert.equal(Object.keys(rows.get('creation-limits').clients).length, GLOBAL_CREATION_LIMIT);
});
test('creation routing hashes network identity and never trusts client limiter headers', async () => {
  const calls = [], env = { KONK_MATCH: {
    idFromName(name) { assert.equal(name, 'match-creation-limits-v1'); return name; },
    get() { return { fetch: async (url, init) => { calls.push(init); return Response.json({ ok: true }); } }; },
  } };
  await checkMatchCreationLimit(new Request('https://api', { headers: { 'CF-Connecting-IP': '192.0.2.1', 'X-Creation-Client': 'spoof' } }), env);
  const client = calls[0].headers['X-Creation-Client'];
  assert.match(client, /^[a-f0-9]{64}$/); assert.ok(!client.includes('192.0.2.1'));
  assert.ok(!JSON.stringify(calls).includes('spoof'));
});
test('profile and search endpoints reject oversized UTF-8 before storage', async () => {
  const env = { ALLOWED_ORIGINS: 'https://konk.world', KONK_MATCH: { idFromName() { throw Error('must not access storage'); } } };
  for (const [path, handler] of [['/players/' + 'a'.repeat(32), routeKonkerProfiles], ['/matchmaking', routePublicMatchmaking]]) {
    const request = new Request('https://api' + path, { method: 'POST',
      headers: { Origin: 'https://konk.world' }, body: 'Ɛ'.repeat(600) });
    assert.equal((await handler(request, env)).status, 413);
  }
});
