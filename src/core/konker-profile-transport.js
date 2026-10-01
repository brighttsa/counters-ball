const KEY = 'konk:profile:v1', CODE = /^([a-f0-9]{32})\.([a-f0-9]{64})$/;
export function parseProfileRecoveryCode(code) {
  const match = CODE.exec(String(code ?? '').trim()); return match ? { id: match[1], secret: match[2] } : null;
}
export function savedKonkerProfile(storage = globalThis.localStorage) {
  try { const saved = JSON.parse(storage?.getItem(KEY));
    return saved && parseProfileRecoveryCode(`${saved.id}.${saved.secret}`) ? saved : null;
  } catch { return null; }
}
const bytes = size => Array.from(crypto.getRandomValues(new Uint8Array(size)), b => b.toString(16).padStart(2, '0')).join('');
export async function accessKonkerProfile(base, credentials, name, fetchImpl = globalThis.fetch) {
  if (!parseProfileRecoveryCode(`${credentials?.id}.${credentials?.secret}`)) throw Error('Invalid recovery code.');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetchImpl(`${base}/players/${credentials.id}`, { method: name === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${credentials.secret}`, ...(name !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      ...(name !== undefined ? { body: JSON.stringify({ id: credentials.id, name }) } : {}), signal: controller.signal });
    const body = await response.json(); if (!response.ok) throw Error(body.error || 'Profile unavailable.');
    if (body.profile?.id !== credentials.id || typeof body.profile.name !== 'string') throw Error('Profile response is invalid.');
    return { ...credentials, ...body.profile };
  } finally { clearTimeout(timer); }
}
export function storeKonkerProfile(profile, storage = globalThis.localStorage) {
  storage.setItem(KEY, JSON.stringify(profile));
}
export function newKonkerProfileCredentials() { return { id: bytes(16), secret: bytes(32) }; }
