import { readBoundedText } from './bounded-request-body.js';
import { validateInterest } from './community-interest-validation.js';
const privateJson = (body, status) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function authorized(request, secret) {
  if (!secret || secret.length < 32) return false;
  const actual = request.headers.get('Authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (actual.length !== expected.length) return false;
  let different = 0;
  for (let i = 0; i < expected.length; i++) different |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return different === 0;
}
export async function routeCommunityInterest(request, env) {
  const path = new URL(request.url).pathname;
  if (!['/community/submit', '/community/export'].includes(path)) return null;
  if (path === '/community/export') {
    if (request.method !== 'GET') return privateJson({ error: 'Method not allowed.' }, 405);
    if (!await authorized(request, env.COMMUNITY_EXPORT_SECRET)) return privateJson({ error: 'Unauthorized.' }, 401);
    const kind = new URL(request.url).searchParams.get('kind');
    if (!['waitlist', 'feedback'].includes(kind)) return privateJson({ error: 'Choose waitlist or feedback.' }, 400);
    return env.KONK_COMMUNITY.get(env.KONK_COMMUNITY.idFromName('interest-v1')).fetch(`https://interest/export?kind=${kind}`);
  }
  if (request.method !== 'POST') return privateJson({ error: 'Method not allowed.' }, 405);
  const origins = (env.ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim());
  if (!origins.includes(request.headers.get('Origin'))) return privateJson({ error: 'Open this form on KONK!.' }, 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return privateJson({ error: 'JSON required.' }, 415);
  const text = await readBoundedText(request, 14000);
  if (text === null) return privateJson({ error: 'Submission is too large.' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return privateJson({ error: 'Invalid submission.' }, 400); }
  const verdict = validateInterest(body);
  if (verdict.error) return privateJson({ error: verdict.error }, 400);
  if (verdict.ignored) return privateJson({ ok: true }, 201);
  const result = await env.KONK_COMMUNITY.get(env.KONK_COMMUNITY.idFromName('interest-v1')).fetch('https://interest/submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Interest-Client': request.headers.get('CF-Connecting-IP') ?? 'local' },
    body: JSON.stringify(verdict.value),
  });
  const response = new Response(result.body, result);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
