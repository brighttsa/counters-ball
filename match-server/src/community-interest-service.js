import { csvCell } from './community-interest-validation.js';
const DAY = 86400000;
function tables(sql) {
  sql.exec('CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, kind TEXT, email TEXT, payload TEXT, created INTEGER, expires INTEGER)');
  sql.exec('CREATE INDEX IF NOT EXISTS submissions_expiry ON submissions(expires)');
  sql.exec('CREATE TABLE IF NOT EXISTS request_limits (id TEXT PRIMARY KEY, count INTEGER, until INTEGER)');
}
export async function saveInterest(ctx, body, client, now = Date.now()) {
  const sql = ctx.storage.sql;
  tables(sql);
  sql.exec('DELETE FROM submissions WHERE expires <= ?', now);
  sql.exec('DELETE FROM request_limits WHERE until <= ?', now);
  let salt = await ctx.storage.get('interest-rate-salt');
  if (!salt) { salt = crypto.randomUUID(); await ctx.storage.put('interest-rate-salt', salt); }
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${Math.floor(now / DAY)}:${client}`));
  const id = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
  const limit = sql.exec('SELECT count FROM request_limits WHERE id = ?', id).toArray()[0];
  if (limit?.count >= 5) return Response.json({ error: 'Too many submissions. Please try again in ten minutes.' }, { status: 429 });
  if (sql.exec('SELECT COUNT(*) AS total FROM request_limits').toArray()[0].total >= 5000 && !limit)
    return Response.json({ error: 'The table is busy. Please try again shortly.' }, { status: 429 });
  sql.exec('INSERT INTO request_limits VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET count = count + 1', id, now + 600000);
  const submissionId = body.kind === 'waitlist' ? `waitlist:${body.email}` : crypto.randomUUID();
  const previous = body.kind === 'waitlist'
    ? sql.exec('SELECT payload FROM submissions WHERE id = ?', submissionId).toArray()[0] : null;
  if (previous) body.platforms = [...new Set([...JSON.parse(previous.payload).platforms, ...body.platforms])];
  if (!previous && sql.exec('SELECT COUNT(*) AS total FROM submissions').toArray()[0].total >= 20000)
    return Response.json({ error: 'The table is busy. Please try again later.' }, { status: 503 });
  const expires = now + (body.kind === 'waitlist' ? 180 : 90) * DAY;
  body.consentedAt = body.consent || body.replyConsent ? new Date(now).toISOString() : '';
  sql.exec('INSERT INTO submissions VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, expires = excluded.expires',
    submissionId, body.kind, body.email, JSON.stringify(body), now, expires);
  await ctx.storage.setAlarm(now + DAY);
  return Response.json({ ok: true }, { status: 201 });
}
export function exportInterest(ctx, kind, now = Date.now()) {
  tables(ctx.storage.sql);
  const rows = ctx.storage.sql.exec('SELECT payload, created FROM submissions WHERE kind = ? AND expires > ? ORDER BY created DESC', kind, now).toArray();
  const fields = kind === 'waitlist' ? ['email', 'name', 'platforms', 'consent', 'consentedAt', 'created']
    : ['email', 'platform', 'rating', 'category', 'device', 'message', 'replyConsent', 'consentedAt', 'created'];
  const records = rows.map(row => ({ ...JSON.parse(row.payload), created: new Date(row.created).toISOString() }));
  const csv = [fields.join(','), ...records.map(row => fields.map(field => csvCell(Array.isArray(row[field]) ? row[field].join(' / ') : row[field])).join(','))].join('\r\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Disposition': `attachment; filename="konk-${kind}.csv"` } });
}
export async function expireInterest(ctx, now = Date.now()) {
  tables(ctx.storage.sql);
  ctx.storage.sql.exec('DELETE FROM submissions WHERE expires <= ?', now);
  ctx.storage.sql.exec('DELETE FROM request_limits WHERE until <= ?', now);
  if (ctx.storage.sql.exec('SELECT COUNT(*) AS total FROM submissions').toArray()[0].total) await ctx.storage.setAlarm(now + DAY);
}
