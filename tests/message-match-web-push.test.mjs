import test from 'node:test';
import assert from 'node:assert/strict';
import {
  b64url, fromB64url, cleanSubscription, encryptPayload, vapidAuthorization, sendPush,
} from '../match-server/src/web-push-vapid-and-aes128gcm.js';

const enc = new TextEncoder();
const hkdf = async (salt, ikm, info, length) => new Uint8Array(await crypto.subtle.deriveBits(
  { name: 'HKDF', hash: 'SHA-256', salt, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), length * 8));
const cat = (...p) => Uint8Array.from(p.flatMap((a) => [...a]));

/** A browser's own subscription keys, so the test can decrypt like the receiving browser does. */
async function browserSubscription(endpoint = 'https://fcm.googleapis.com/fcm/send/abc123') {
  const keys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const p256dh = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey));
  return { keys, auth, sub: { endpoint, keys: { p256dh: b64url(p256dh), auth: b64url(auth) } } };
}

/** RFC 8291 decryption, written independently from the sender side. */
async function decrypt({ keys, auth, sub }, body) {
  const salt = body.slice(0, 16);
  const rs = new DataView(body.buffer, body.byteOffset).getUint32(16);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const cipher = body.slice(21 + idlen);
  assert.equal(rs, 4096);
  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, keys.privateKey, 256));
  const ikm = await hkdf(auth, ecdh, cat(enc.encode('WebPush: info\0'), fromB64url(sub.keys.p256dh), asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce },
    await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), cipher));
  assert.equal(plain.at(-1), 2, 'single final record delimiter');
  return new TextDecoder().decode(plain.slice(0, -1));
}

async function vapidKeys() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  return { pair, vapid: { privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey),
    publicKey: b64url(await crypto.subtle.exportKey('raw', pair.publicKey)), subject: 'https://konk.world' } };
}

test('a pushed payload decrypts on the receiving browser exactly (RFC 8291)', async () => {
  const browser = await browserSubscription();
  const message = JSON.stringify({ title: 'Your move in KONK!', body: 'Ama flicked. Ama 1–0 Kofi', url: 'https://konk.world/?m=abcdefghij' });
  const body = await encryptPayload(browser.sub, message);
  assert.equal(await decrypt(browser, body), message);
  const again = await encryptPayload(browser.sub, message);
  assert.notDeepEqual(again, body, 'fresh salt and sender key every time');
});

test('the VAPID token is a valid ES256 JWT for the push service origin', async () => {
  const { pair, vapid } = await vapidKeys();
  const now = Date.UTC(2026, 8, 25);
  const auth = await vapidAuthorization('https://web.push.apple.com/QGuQyavXutnMH', vapid, now);
  const [, token, k] = auth.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(k, vapid.publicKey);
  const [h, c, s] = token.split('.');
  const claims = JSON.parse(new TextDecoder().decode(fromB64url(c)));
  assert.deepEqual(claims, { aud: 'https://web.push.apple.com', exp: now / 1000 + 12 * 3600, sub: 'https://konk.world' });
  assert.equal(JSON.parse(new TextDecoder().decode(fromB64url(h))).alg, 'ES256');
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, fromB64url(s), enc.encode(`${h}.${c}`)));
});

test('only real browser push services are accepted as subscription endpoints', async () => {
  const { sub } = await browserSubscription();
  assert.deepEqual(cleanSubscription({ ...sub, extra: 1 }), sub);
  for (const endpoint of ['https://web.push.apple.com/x', 'https://updates.push.services.mozilla.com/wpush/v2/x', 'https://wns2-par02p.notify.windows.com/w/?token=x']) {
    assert.ok(cleanSubscription({ ...sub, endpoint }), endpoint);
  }
  for (const endpoint of ['http://fcm.googleapis.com/x', 'https://evil.example/x', 'https://fcm.googleapis.com.evil.example/x', 'https://169.254.169.254/latest', 'nope']) {
    assert.equal(cleanSubscription({ ...sub, endpoint }), null, endpoint);
  }
  assert.equal(cleanSubscription({ ...sub, keys: { ...sub.keys, auth: 'AAAA' } }), null);
  assert.equal(cleanSubscription(null), null);
});

test('sendPush posts an encrypted body and reports dead subscriptions', async () => {
  const browser = await browserSubscription();
  const { vapid } = await vapidKeys();
  let seen;
  const status = await sendPush(browser.sub, { title: 'Hi' }, vapid, async (url, init) => { seen = { url, init }; return { ok: true, status: 201 }; });
  assert.equal(status, 'sent');
  assert.equal(seen.url, browser.sub.endpoint);
  assert.equal(seen.init.headers['Content-Encoding'], 'aes128gcm');
  assert.equal(JSON.parse(await decrypt(browser, seen.init.body)).title, 'Hi');
  assert.equal(await sendPush(browser.sub, {}, vapid, async () => ({ ok: false, status: 410 })), 'gone');
  assert.equal(await sendPush(browser.sub, {}, vapid, async () => { throw new Error('offline'); }), 'failed');
});
