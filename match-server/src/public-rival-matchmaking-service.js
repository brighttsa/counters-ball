import { createRoom, joinRoom, publicRoom, newRoom, cleanRoomName } from './live-match-room-rules.js';

export const SEARCH_LEASE_MS = 20_000;
const RESULT_MS = 120_000;
const CAPACITY = 100;
const TICKET = /^[a-f0-9]{36}$/;
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

// Called inside the queue object's concurrency lock: a ticket can be paired only once.
export async function handlePublicMatchmaking(ctx, env, body, now = Date.now(), client = 'local') {
  if (!TICKET.test(body?.ticket ?? '') || !['join', 'poll', 'cancel'].includes(body?.action)) {
    return json({ error: 'invalid search request' }, 400);
  }
  const entries = await ctx.storage.get('public-searches') ?? {};
  for (const [key, entry] of Object.entries(entries)) if (entry.expiresAt <= now) delete entries[key];
  const limits = await ctx.storage.get('public-search-limits') ?? {};
  for (const [key, value] of Object.entries(limits)) if (value.until <= now) delete limits[key];
  const limit = limits[client] ?? { requests: 0, joins: 0, until: now + 60_000 };
  if (++limit.requests > 240 || (body.action === 'join' && !entries[body.ticket] && ++limit.joins > 20)) {
    return json({ error: 'too many searches; try again shortly' }, 429);
  }
  if (!limits[client] && Object.keys(limits).length >= 1000) return json({ error: 'search is busy' }, 429);
  limits[client] = limit;
  await ctx.storage.put('public-search-limits', limits);
  let entry = entries[body.ticket];
  const save = async () => {
    await ctx.storage.put('public-searches', entries);
    await ctx.storage.setAlarm(now + RESULT_MS);
  };
  if (entry?.result) return json({ state: 'matched', ...entry.result });
  if (body.action === 'cancel') {
    if (!entry && Object.keys(entries).length >= CAPACITY * 10) return json({ error: 'search is busy' }, 429);
    // Tombstones also cancel a delayed join that arrived after its cancellation.
    entries[body.ticket] = { state: 'cancelled', expiresAt: now + RESULT_MS };
    await save();
    return json({ state: 'cancelled' });
  }
  if (entry?.state === 'cancelled') return json({ state: 'cancelled' });
  if (!entry && body.action === 'poll') return json({ state: 'expired' });
  if (!entry) {
    if (Object.values(entries).filter(value => value.state === 'waiting').length >= CAPACITY ||
        Object.keys(entries).length >= CAPACITY * 10) return json({ error: 'search is busy; try again shortly' }, 429);
    entry = entries[body.ticket] = { state: 'waiting', name: cleanRoomName(body.name),
      joinedAt: now, expiresAt: now + SEARCH_LEASE_MS };
  }
  entry.expiresAt = now + SEARCH_LEASE_MS;
  const rival = Object.entries(entries).filter(([key, value]) => key !== body.ticket && value.state === 'waiting')
    .sort((a, b) => a[1].joinedAt - b[1].joinedAt)[0];
  if (rival) {
    const [rivalTicket, waiting] = rival;
    const id = newRoom();
    const room = createRoom({ levelId: 'schoolyard', homeName: waiting.name, now });
    joinRoom(room, { name: entry.name, now });
    room.matchmaking = true;
    const stub = env.KONK_MATCH.get(env.KONK_MATCH.idFromName(id));
    const installed = await stub.fetch('https://match/room/public-match', {
      method: 'POST', body: JSON.stringify({ room }),
    });
    if (!installed.ok) return json({ error: 'could not open the table; retry search' }, 503);
    for (const [ticket, seat] of [[rivalTicket, 'home'], [body.ticket, 'away']]) {
      entries[ticket] = { state: 'matched', expiresAt: now + RESULT_MS,
        result: { id, seat, token: room.seats[seat].token, room: publicRoom(room, now) } };
    }
  }
  await save();
  const result = entries[body.ticket];
  return json(result.result ? { state: 'matched', ...result.result } : { state: 'waiting' });
}

export async function routePublicMatchmaking(request, env) {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim());
  if (!allowed.includes(request.headers.get('Origin') ?? '')) return json({ error: 'origin not allowed' }, 403);
  const text = await request.text();
  if (text.length > 1024) return json({ error: 'search request too large' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: 'invalid search request' }, 400); }
  // Cloudflare supplies this address; retain only a digest for short-lived abuse limits.
  const address = request.headers.get('CF-Connecting-IP') ?? 'local';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(address));
  const client = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
  const queue = env.KONK_MATCH.get(env.KONK_MATCH.idFromName('public-casual-matchmaking-v1'));
  return queue.fetch('https://match/matchmaking', { method: 'POST', headers: { 'X-Queue-Client': client }, body: JSON.stringify(body) });
}
