export function interestPayload(data, kind) {
  const common = { kind, website: data.get('website') ?? '', email: String(data.get('email') ?? '').trim() };
  if (kind === 'waitlist') {
    const platforms = data.getAll('platforms');
    if (!platforms.length) throw Error('Choose iOS, Android, or both.');
    return { ...common, platforms, name: data.get('name'), consent: data.has('consent') };
  }
  if (common.email && !data.has('replyConsent')) throw Error('Agree to a feedback reply, or leave your email blank.');
  return { ...common, platform: data.get('platform'), category: data.get('category'),
    device: data.get('device'), rating: Number(data.get('rating')), message: data.get('message'), replyConsent: data.has('replyConsent') };
}
export async function submitInterest(payload, {
  fetchImpl = globalThis.fetch, location = globalThis.location,
  timeout = 12000,
} = {}) {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const base = local ? 'http://localhost:8788' : 'https://konk-match-server.konk-match-server.workers.dev';
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetchImpl(`${base}/community/submit`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
    let body;
    try { body = await response.json(); } catch { throw Error("We couldn't save that yet. Please try again. Your form is still here."); }
    if (!response.ok || body.ok !== true) throw Error(body.error || "We couldn't save that yet. Please try again.");
  } catch (error) {
    if (error.name === 'AbortError') throw Error('The connection took too long. Please retry; your form is still here.');
    if (error instanceof TypeError) throw Error("Can't reach the table right now. Check your connection and try again.");
    throw error;
  } finally { clearTimeout(timer); }
}
