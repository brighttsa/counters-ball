// KONK! Message Match server: a Cloudflare Worker in front of one Durable Object per match.
//   POST /matches            { letter }  → 201 { id, seq }        opens a match with home's first move
//   POST /matches/:id/turns  { letter }  → 200 { seq } | 409      appends the next move, strictly in order
//   GET  /matches/:id                    → 200 { letter, seq }    the latest move (what a short link opens)
//   POST /matches/:id/subscribe { side, subscription } → 204        Web Push for that side's "your move"
//   GET  /m/:id           → preview page (Open Graph tags + redirect into the game)
//   GET  /m/:id/card.png  → the score card chat apps show for that link
// The Durable Object handles one request at a time, so two replies to the same move can never both land.
import { DurableObject } from 'cloudflare:workers';
import { checkNextLetter, checkOpeningLetter, MATCH_ID, MAX_LETTER_BYTES, newMatchId, pushMessageFor } from './match-turn-ledger-rules.js';
import { cleanSubscription, sendPush } from './web-push-vapid-and-aes128gcm.js';
import { describeMatch, previewPageHtml, scoreCardSvg } from './match-link-preview-card-and-page.js';
import { renderScoreCardPng } from './score-card-png-renderer.js';

const MATCH_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // a match nobody touches for 30 days is deleted

export class KonkMatch extends DurableObject {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const latest = await this.ctx.storage.get('latest');
    if (request.method === 'GET') return latest ? json({ letter: latest, seq: latest.k }) : json({ error: 'no such match' }, 404);

    const body = await request.json();
    if (pathname.endsWith('/subscribe')) return this.subscribe(latest, body);
    const letter = body.letter;
    const verdict = pathname.endsWith('/open')
      ? (latest ? { ok: false, status: 409, error: 'match already exists' } : checkOpeningLetter(letter))
      : (latest ? checkNextLetter(latest, letter) : { ok: false, status: 404, error: 'no such match' });
    if (!verdict.ok) return json({ error: verdict.error, ...(latest ? { letter: latest, seq: latest.k } : {}) }, verdict.status);

    await this.ctx.storage.put({ latest: letter, [`turn:${String(letter.k).padStart(4, '0')}`]: letter });
    await this.ctx.storage.setAlarm(Date.now() + MATCH_LIFETIME_MS);
    if (latest) this.ctx.waitUntil(this.notify(letter)); // the sender's share sheet never waits on a push service
    return json({ seq: letter.k }, latest ? 200 : 201);
  }

  async subscribe(latest, { side, subscription, id }) {
    const clean = cleanSubscription(subscription);
    if (!latest) return json({ error: 'no such match' }, 404);
    if ((side !== 'home' && side !== 'away') || !clean || !MATCH_ID.test(id ?? '')) return json({ error: 'bad subscription' }, 400);
    await this.ctx.storage.put({ [`push:${side}`]: clean, matchId: id });
    return new Response(null, { status: 204 });
  }

  async notify(letter) {
    const vapid = vapidFrom(this.env);
    const matchId = await this.ctx.storage.get('matchId');
    if (!vapid || !matchId) return;
    const { to, payload } = pushMessageFor(letter, matchId, this.env.SITE_URL);
    const subscription = await this.ctx.storage.get(`push:${to}`);
    if (subscription && await sendPush(subscription, payload, vapid) === 'gone') await this.ctx.storage.delete(`push:${to}`);
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const routed = await route(request, env).catch(() => json({ error: 'server error' }, 500));
    const response = new Response(routed.body, routed); // Durable Object responses have immutable headers
    for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
    return response;
  },
};

async function route(request, env) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  if (parts[0] === 'm' && request.method === 'GET') return preview(request, env, parts[1], parts[2]);
  if (parts[0] !== 'matches') return json({ error: 'not found' }, 404);
  const [, id, action] = parts;

  if (request.method === 'POST' && !id) {
    const body = await readBody(request);
    if (!body) return json({ error: 'letter missing or too large' }, 413);
    const matchId = newMatchId();
    const res = await stub(env, matchId).fetch('https://match/open', { method: 'POST', body });
    return res.status === 201 ? json({ id: matchId, seq: (await res.json()).seq }, 201) : res;
  }
  if (!id || !MATCH_ID.test(id)) return json({ error: 'not found' }, 404);
  if (request.method === 'GET' && !action) return stub(env, id).fetch('https://match/latest');
  if (request.method === 'POST' && action === 'subscribe') {
    const text = await request.text();
    if (text.length > 4096) return json({ error: 'too large' }, 413);
    let parsed;
    try { parsed = JSON.parse(text); } catch { return json({ error: 'bad subscription' }, 400); }
    const body = JSON.stringify({ side: parsed?.side, subscription: parsed?.subscription, id });
    return stub(env, id).fetch('https://match/subscribe', { method: 'POST', body });
  }
  if (request.method === 'POST' && action === 'turns') {
    const body = await readBody(request);
    if (!body) return json({ error: 'letter missing or too large' }, 413);
    return stub(env, id).fetch('https://match/turns', { method: 'POST', body });
  }
  return json({ error: 'not found' }, 404);
}

/** konk.world/m/<id>: a preview page, or its score card image. Unknown matches go to the game's home. */
async function preview(request, env, id, asset) {
  const site = env.SITE_URL;
  if (!MATCH_ID.test(id ?? '') || (asset && asset !== 'card.png')) return Response.redirect(site, 302);
  const cache = caches.default;
  const cached = asset ? await cache.match(request) : null;
  if (cached) return cached;
  const res = await stub(env, id).fetch('https://match/latest');
  if (!res.ok) return Response.redirect(site, 302);
  const { letter, seq } = await res.json();
  const match = describeMatch(letter);
  if (!asset) {
    return new Response(previewPageHtml(match, { siteUrl: site, matchId: id, seq }), { headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
  }
  const png = new Response(await renderScoreCardPng(scoreCardSvg(match)), { headers: {
    'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } }); // ?s=<move> changes with every move
  await cache.put(request, png.clone());
  return png;
}

/** VAPID signing key (Worker secret VAPID_PRIVATE_JWK) plus its public half; null until both are configured. */
function vapidFrom(env) {
  if (!env.VAPID_PRIVATE_JWK || !env.VAPID_PUBLIC_KEY) return null;
  try { return { privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK), publicKey: env.VAPID_PUBLIC_KEY, subject: env.SITE_URL }; } catch { return null; }
}

const stub = (env, id) => env.KONK_MATCH.get(env.KONK_MATCH.idFromName(id));

/** The raw body, re-serialised only if it is a small JSON object with a `letter`. */
async function readBody(request) {
  const text = await request.text();
  if (text.length > MAX_LETTER_BYTES) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed.letter === 'object' ? JSON.stringify({ letter: parsed.letter }) : null;
  } catch { return null; }
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim());
  return allowed.includes(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
    : { Vary: 'Origin' };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
