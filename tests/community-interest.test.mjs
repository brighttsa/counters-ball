import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInterest, csvCell } from '../match-server/src/community-interest-validation.js';
import { routeCommunityInterest } from '../match-server/src/community-interest-routes.js';
import { interestPayload, submitInterest } from '../waitlist/waitlist-transport.js';
import { DatabaseSync } from 'node:sqlite';
import { saveInterest, exportInterest, expireInterest } from '../match-server/src/community-interest-service.js';
const waitlist = { kind: 'waitlist', email: ' Player@Example.com ', platforms: ['ios'], consent: true };
const feedback = { kind: 'feedback', email: '', platform: 'web', rating: 4, message: 'YƐ KONKI! The ball feels great.' };
test('waitlist normalizes email and requires platform and separate consent', () => {
  assert.equal(validateInterest(waitlist).value.email, 'player@example.com');
  for (const extra of [{ platforms: [] }, { platforms: ['other'] }, { consent: false }, { email: 'invalid' }])
    assert.ok(validateInterest({ ...waitlist, ...extra }).error);
  assert.deepEqual(validateInterest({ ...waitlist, platforms: ['ios', 'ios'] }).value.platforms, ['ios']);
});
test('feedback can be anonymous, preserves Twi and never enrolls in waitlist', () => {
  const value = validateInterest(feedback).value;
  assert.equal(value.message, feedback.message); assert.equal(value.kind, 'feedback');
  assert.equal(value.email, ''); assert.equal(value.platforms, undefined);
  assert.ok(validateInterest({ ...feedback, email: 'a@example.com' }).error);
  assert.equal(validateInterest({ ...feedback, email: 'a@example.com', replyConsent: true }).value.email, 'a@example.com');
});
test('malformed, huge and unrated submissions are refused', () => {
  for (const body of [null, [], { ...feedback, message: 'short' }, { ...feedback, message: 'a'.repeat(3001) },
    { ...feedback, rating: 0 }, { ...feedback, rating: 4.5 }, { ...feedback, platform: 'console' },
    { ...waitlist, email: 'a'.repeat(255) + '@example.com' }]) assert.ok(validateInterest(body).error);
  assert.equal(validateInterest({ ...waitlist, website: 'spam' }).ignored, true);
});
test('spreadsheet export quotes text and neutralizes formula injection', () => {
  assert.equal(csvCell('=IMPORTXML("x")'), '"\'=IMPORTXML(""x"")"');
  assert.equal(csvCell('\n+1'), '"\'\n+1"');
  assert.equal(csvCell('YƐ KONKI!'), '"YƐ KONKI!"');
});
test('public routes refuse cross-origin, unauthenticated export and oversized bodies', async () => {
  const env = { ALLOWED_ORIGINS: 'https://konk.world', COMMUNITY_EXPORT_SECRET: 'a'.repeat(32) };
  const post = (headers, body) => new Request('https://api/community/submit', { method: 'POST', headers, body });
  assert.equal((await routeCommunityInterest(post({ Origin: 'https://evil.test' }, '{}'), env)).status, 403);
  assert.equal((await routeCommunityInterest(post({ Origin: 'https://konk.world', 'Content-Type': 'text/plain' }, '{}'), env)).status, 415);
  assert.equal((await routeCommunityInterest(post({ Origin: 'https://konk.world', 'Content-Type': 'application/json' }, 'a'.repeat(14001)), env)).status, 413);
  assert.equal((await routeCommunityInterest(new Request('https://api/community/export?kind=waitlist'), env)).status, 401);
  assert.equal(await routeCommunityInterest(new Request('https://api/elsewhere'), env), null);
});
test('frontend payload keeps reply permission separate from waitlist', () => {
  const form = new FormData(); form.set('email', 'a@example.com');
  assert.throws(() => interestPayload(form, 'waitlist'), /Choose/);
  form.append('platforms', 'ios'); form.append('platforms', 'android'); form.set('consent', 'on');
  assert.deepEqual(interestPayload(form, 'waitlist').platforms, ['ios', 'android']);
  assert.throws(() => interestPayload(form, 'feedback'), /Agree/);
});
test('transport surfaces failure, timeout, and requires an actual saved acknowledgement', async () => {
  const options = { location: { hostname: 'localhost' }, fetchImpl: async (url) => {
    assert.equal(url, 'http://localhost:8788/community/submit'); return Response.json({ ok: true }, { status: 201 }); } };
  await submitInterest(waitlist, options);
  await assert.rejects(submitInterest(waitlist, { ...options, fetchImpl: async () => Response.json({ error: 'Try later' }, { status: 429 }) }), /Try later/);
  await assert.rejects(submitInterest(waitlist, { ...options, fetchImpl: async () => Response.json({}) }), /couldn't save/);
  await assert.rejects(submitInterest(waitlist, { ...options, fetchImpl: async () => { throw new DOMException('', 'AbortError'); } }), /too long/);
});
function sqliteContext() {
  const db = new DatabaseSync(':memory:'), kv = new Map();
  return { db, storage: { sql: { exec(query, ...args) {
    const statement = db.prepare(query);
    const rows = statement.columns().length ? statement.all(...args) : (statement.run(...args), []);
    return { toArray: () => rows };
  } }, get: async key => kv.get(key), put: async (key, value) => kv.set(key, value), setAlarm: async () => {} } };
}
test('real SQLite stores merged platforms, private feedback and removes expired records', async () => {
  const ctx = sqliteContext(), now = 1_800_000_000_000, day = 86400000;
  try {
    for (const platforms of [['ios'], ['android']]) assert.equal((await saveInterest(ctx,
      validateInterest({ ...waitlist, platforms }).value, 'test-network', now)).status, 201);
    await saveInterest(ctx, validateInterest(feedback).value, 'test-network', now);
    const csv = await exportInterest(ctx, 'waitlist', now).text();
    assert.equal(csv.split('player@example.com').length - 1, 1); assert.match(csv, /ios \/ android/);
    assert.match(await exportInterest(ctx, 'feedback', now).text(), /YƐ KONKI!/);
    await expireInterest(ctx, now + 91 * day);
    assert.doesNotMatch(await exportInterest(ctx, 'feedback', now + 91 * day).text(), /YƐ/);
    assert.match(await exportInterest(ctx, 'waitlist', now + 91 * day).text(), /player/);
    await expireInterest(ctx, now + 181 * day);
    assert.doesNotMatch(await exportInterest(ctx, 'waitlist', now + 181 * day).text(), /player/);
  } finally { ctx.db.close(); }
});
test('real SQLite enforces five-request window without storing raw network identity', async () => {
  const ctx = sqliteContext(), now = 1_800_000_000_000;
  try {
    for (let i = 0; i < 5; i++) assert.equal((await saveInterest(ctx, validateInterest(waitlist).value, 'network', now)).status, 201);
    assert.equal((await saveInterest(ctx, validateInterest(waitlist).value, 'network', now)).status, 429);
    const key = ctx.db.prepare('SELECT id FROM request_limits').get().id;
    assert.match(key, /^[a-f0-9]{64}$/); assert.notEqual(key, 'network');
    assert.equal((await saveInterest(ctx, validateInterest(waitlist).value, 'network', now + 600001)).status, 201);
  } finally { ctx.db.close(); }
});
