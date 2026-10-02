import { createRoom, joinRoom, publicRoom, newRoom, cleanRoomName } from './live-match-room-rules.js';
import { readBoundedText } from './bounded-request-body.js';
import { publicRivalSearchStorage } from './public-rival-search-storage.js';

export const SEARCH_LEASE_MS = 20_000;
const RESULT_MS = 120_000;
const TICKET = /^[a-f0-9]{36}$/;
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

// Called inside the queue object's concurrency lock: a ticket can be paired only once.
export async function handlePublicMatchmaking(ctx, env, body, now = Date.now(), client = 'local') {
  if (!TICKET.test(body?.ticket ?? '') || !['join', 'poll', 'cancel'].includes(body?.action)) {
    return json({ error: 'invalid search request' }, 400);
  }
  const store = await publicRivalSearchStorage(ctx);
  let entry = store.get(body.ticket, now);
  if (!store.limit(client, now, body.action === 'join' && !entry)) {
    return json({ error: 'too many searches; try again shortly' }, 429);
  }
  await store.schedule(now);
  if (entry?.result) return json({ state: 'matched', ...entry.result });
  if (body.action === 'cancel') {
    // Tombstones also cancel a delayed join that arrived after its cancellation.
    store.put(body.ticket, { state: 'cancelled', expiresAt: now + RESULT_MS });
    return json({ state: 'cancelled' });
  }
  if (entry?.state === 'cancelled') return json({ state: 'cancelled' });
  if (!entry && body.action === 'poll') return json({ state: 'expired' });
  if (!entry) {
    entry = { state: 'waiting', name: cleanRoomName(body.name),
      joinedAt: now, expiresAt: now + SEARCH_LEASE_MS };
  }
  entry.expiresAt = now + SEARCH_LEASE_MS;
  store.put(body.ticket, entry);
  const rival = store.oldest(body.ticket, now);
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
      store.put(ticket, { state: 'matched', expiresAt: now + RESULT_MS,
        result: { id, seat, token: room.seats[seat].token, room: publicRoom(room, now) } });
    }
  }
  const result = store.get(body.ticket, now);
  return json(result.result ? { state: 'matched', ...result.result } : { state: 'waiting' });
}

export async function routePublicMatchmaking(request, env) {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim());
  if (!allowed.includes(request.headers.get('Origin') ?? '')) return json({ error: 'origin not allowed' }, 403);
  const text = await readBoundedText(request, 1024);
  if (text === null) return json({ error: 'search request too large' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: 'invalid search request' }, 400); }
  // Cloudflare supplies this address; retain only a digest for short-lived abuse limits.
  const address = request.headers.get('CF-Connecting-IP') ?? 'local';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(address));
  const client = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
  const queue = env.KONK_MATCH.get(env.KONK_MATCH.idFromName('public-casual-matchmaking-v1'));
  return queue.fetch('https://match/matchmaking', { method: 'POST', headers: { 'X-Queue-Client': client }, body: JSON.stringify(body) });
}
