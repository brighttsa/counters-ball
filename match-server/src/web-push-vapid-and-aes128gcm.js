// Web Push without libraries: VAPID auth (RFC 8292) and aes128gcm payload encryption (RFC 8291/8188),
// using only WebCrypto so it runs in Workers, browsers and Node alike.

const enc = new TextEncoder();
export const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const fromB64url = (text) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};

// Only browser push services may be called, so a stored "subscription" can never aim the server elsewhere.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/, /^push\.services\.mozilla\.com$/];

/** A browser PushSubscription (JSON form), checked; returns the clean subset or null. */
export function cleanSubscription(sub) {
  try {
    const url = new URL(sub?.endpoint);
    if (url.protocol !== 'https:' || !PUSH_HOSTS.some((re) => re.test(url.hostname)) || sub.endpoint.length > 1024) return null;
    const p256dh = fromB64url(sub.keys?.p256dh ?? '');
    const auth = fromB64url(sub.keys?.auth ?? '');
    if (p256dh.length !== 65 || p256dh[0] !== 4 || auth.length !== 16) return null;
    return { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } };
  } catch { return null; }
}

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}

/** RFC 8291 message encryption: the body a push service delivers to exactly one browser. */
export async function encryptPayload(subscription, plaintext, { salt = crypto.getRandomValues(new Uint8Array(16)), senderKeys } = {}) {
  const uaPublic = fromB64url(subscription.keys.p256dh);
  const authSecret = fromB64url(subscription.keys.auth);
  const sender = senderKeys ?? await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', sender.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, sender.privateKey, 256));
  const ikm = await hkdf(authSecret, ecdh, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const record = concat(enc.encode(plaintext), new Uint8Array([2])); // 0x02: last (and only) record
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, record));
  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  return concat(header, asPublic, cipher);
}

/** VAPID Authorization header value for one push service origin. */
export async function vapidAuthorization(endpoint, { privateJwk, publicKey, subject }, now = Date.now()) {
  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64url(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })));
  const key = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64url(signature)}, k=${publicKey}`;
}

/**
 * Sends one notification. Resolves to 'sent', 'gone' (the subscription is dead: forget it) or 'failed'.
 * @param vapid { privateJwk, publicKey, subject }
 */
export async function sendPush(subscription, payload, vapid, fetchImpl = fetch) {
  try {
    const body = await encryptPayload(subscription, JSON.stringify(payload));
    const res = await fetchImpl(subscription.endpoint, { method: 'POST', body, headers: {
      Authorization: await vapidAuthorization(subscription.endpoint, vapid),
      'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'normal',
    } });
    if (res.status === 404 || res.status === 410) return 'gone';
    return res.ok ? 'sent' : 'failed';
  } catch { return 'failed'; }
}
