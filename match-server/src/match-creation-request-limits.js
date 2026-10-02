const WINDOW_MS = 60_000;
export const CLIENT_CREATION_LIMIT = 12, GLOBAL_CREATION_LIMIT = 300;
const rejected = () => Response.json({ error: 'too many new tables; retry shortly' }, {
  status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
});

// One shared object serializes both routes so changing room type cannot bypass limits.
export async function limitMatchCreation(ctx, client, now = Date.now()) {
  if (!/^[a-f0-9]{64}$/.test(client ?? '')) return Response.json({ error: 'invalid client' }, { status: 400 });
  let state = await ctx.storage.get('creation-limits');
  if (!state || state.until <= now) state = { until: now + WINDOW_MS, total: 0, clients: {} };
  if (state.total >= GLOBAL_CREATION_LIMIT || (state.clients[client] ?? 0) >= CLIENT_CREATION_LIMIT) return rejected();
  state.total++;
  state.clients[client] = (state.clients[client] ?? 0) + 1;
  await ctx.storage.put('creation-limits', state);
  await ctx.storage.setAlarm(state.until);
  return Response.json({ ok: true });
}

export async function checkMatchCreationLimit(request, env) {
  const address = request.headers.get('CF-Connecting-IP') ?? 'local';
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(address));
  const client = Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
  return env.KONK_MATCH.get(env.KONK_MATCH.idFromName('match-creation-limits-v1')).fetch('https://match/creation-limit', {
    method: 'POST', headers: { 'X-Creation-Client': client },
  });
}
