import { cleanRoomName } from './live-match-room-rules.js';
import { checkProfileRequestLimit } from './profile-request-limits.js';
const ID = /^[a-f0-9]{32}$/, SECRET = /^[a-f0-9]{64}$/;
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const hash = async secret => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))), b => b.toString(16).padStart(2, '0')).join('');
export async function handleKonkerProfile(ctx, request, now = Date.now()) {
  const secret = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!SECRET.test(secret ?? '')) return json({ error: 'invalid recovery credentials' }, 403);
  const digest = await hash(secret), existing = await ctx.storage.get('konker-profile');
  if (existing && existing.secretHash !== digest) return json({ error: 'invalid recovery credentials' }, 403);
  if (request.method === 'GET') return existing ? json({ profile: existing.profile }) : json({ error: 'profile not found' }, 404);
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const text = await request.text(); if (text.length > 1024) return json({ error: 'profile request too large' }, 413);
  let body; try { body = JSON.parse(text); } catch { return json({ error: 'invalid profile' }, 400); }
  if (!ID.test(body?.id ?? '') || typeof body.name !== 'string') return json({ error: 'invalid profile' }, 400);
  if (existing && existing.profile.id !== body.id) return json({ error: 'profile identity changed' }, 409);
  const profile = { id: body.id, name: cleanRoomName(body.name, 'KONKER'), createdAt: existing?.profile.createdAt ?? now, updatedAt: now };
  await ctx.storage.put('konker-profile', { profile, secretHash: digest });
  return json({ profile }, existing ? 200 : 201);
}
export async function routeKonkerProfiles(request, env) {
  const path = new URL(request.url).pathname;
  if (!path.startsWith('/players/')) return null;
  const id = path.slice('/players/'.length);
  if (!ID.test(id)) return json({ error: 'profile not found' }, 404);
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim());
  if (!allowed.includes(request.headers.get('Origin') ?? '')) return json({ error: 'origin not allowed' }, 403);
  if (!['GET', 'POST'].includes(request.method)) return json({ error: 'method not allowed' }, 405);
  const text = request.method === 'POST' ? await request.text() : undefined;
  if (text?.length > 1024) return json({ error: 'profile request too large' }, 413);
  if (text) {
    let body; try { body = JSON.parse(text); } catch { return json({ error: 'invalid profile' }, 400); }
    if (body?.id !== id) return json({ error: 'profile identity changed' }, 409);
  }
  if (!SECRET.test(request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '')) return json({ error: 'invalid recovery credentials' }, 403);
  const limit = await checkProfileRequestLimit(request, env); if (!limit.ok) return limit;
  const stub = env.KONK_MATCH.get(env.KONK_MATCH.idFromName(`player:${id}`));
  return stub.fetch('https://match/player', { method: request.method, headers: { Authorization: request.headers.get('Authorization') ?? '' }, ...(text !== undefined ? { body: text } : {}) });
}
