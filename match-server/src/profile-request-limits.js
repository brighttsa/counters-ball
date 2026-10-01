const WINDOW_MS = 60_000;
export async function limitProfileRequest(ctx, client, now = Date.now()) {
  if (!/^[a-f0-9]{64}$/.test(client ?? '')) return Response.json({ error: 'invalid client' }, { status: 400 });
  const limits = await ctx.storage.get('profile-request-limits') ?? {};
  for (const [key, value] of Object.entries(limits)) if (value.until <= now) delete limits[key];
  if (!limits[client] && Object.keys(limits).length >= 1000) return Response.json({ error: 'profiles are busy; retry shortly' }, { status: 429 });
  const limit = limits[client] ?? { requests: 0, until: now + WINDOW_MS };
  if (limit.requests >= 30) return Response.json({ error: 'too many profile requests; retry shortly' }, { status: 429 });
  limit.requests++; limits[client] = limit;
  await ctx.storage.put('profile-request-limits', limits);
  await ctx.storage.setAlarm(now + WINDOW_MS);
  return Response.json({ ok: true });
}
export async function checkProfileRequestLimit(request, env) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(request.headers.get('CF-Connecting-IP') ?? 'local'));
  const client = Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
  return env.KONK_MATCH.get(env.KONK_MATCH.idFromName('profile-request-limits-v1')).fetch('https://match/profile-limit', {
    method: 'POST', headers: { 'X-Profile-Client': client },
  });
}
