// KONK! Message Match server: a Cloudflare Worker in front of one Durable Object per match.
//   POST /matches            { letter }  → 201 { id, seq }        opens a match with home's first move
//   POST /matches/:id/turns  { letter }  → 200 { seq } | 409      appends the next move, strictly in order
//   GET  /matches/:id                    → 200 { letter, seq }    the latest move (what a short link opens)
// The Durable Object handles one request at a time, so two replies to the same move can never both land.
import { DurableObject } from 'cloudflare:workers';
import { checkNextLetter, checkOpeningLetter, MATCH_ID, MAX_LETTER_BYTES, newMatchId } from './match-turn-ledger-rules.js';

const MATCH_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // a match nobody touches for 30 days is deleted

export class KonkMatch extends DurableObject {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const latest = await this.ctx.storage.get('latest');
    if (request.method === 'GET') return latest ? json({ letter: latest, seq: latest.k }) : json({ error: 'no such match' }, 404);

    const letter = (await request.json()).letter;
    const verdict = pathname.endsWith('/open')
      ? (latest ? { ok: false, status: 409, error: 'match already exists' } : checkOpeningLetter(letter))
      : (latest ? checkNextLetter(latest, letter) : { ok: false, status: 404, error: 'no such match' });
    if (!verdict.ok) return json({ error: verdict.error, ...(latest ? { letter: latest, seq: latest.k } : {}) }, verdict.status);

    await this.ctx.storage.put({ latest: letter, [`turn:${String(letter.k).padStart(4, '0')}`]: letter });
    await this.ctx.storage.setAlarm(Date.now() + MATCH_LIFETIME_MS);
    return json({ seq: letter.k }, latest ? 200 : 201);
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
  if (request.method === 'POST' && action === 'turns') {
    const body = await readBody(request);
    if (!body) return json({ error: 'letter missing or too large' }, 413);
    return stub(env, id).fetch('https://match/turns', { method: 'POST', body });
  }
  return json({ error: 'not found' }, 404);
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
