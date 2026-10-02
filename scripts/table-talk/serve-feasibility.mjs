import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { parseEnv } from 'node:util';
import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';

const root = new URL('../../', import.meta.url);
const secrets = parseEnv(await readFile(new URL('../../../match-server/.dev.vars', import.meta.url), 'utf8'));
for (const key of ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET']) {
  if (!secrets[key]) throw new Error('Local provider configuration is incomplete');
}
const origin = 'http://127.0.0.1:4192';
const room = `konk-feasibility-${randomUUID()}`;
const provider = new RoomServiceClient(secrets.LIVEKIT_URL.replace('wss:', 'https:'),
  secrets.LIVEKIT_API_KEY, secrets.LIVEKIT_API_SECRET);
const routes = new Map([
  ['/', ['tests/fixtures/table-talk/index.html', 'text/html']],
  ['/probe.js', ['tests/fixtures/table-talk/probe.js', 'text/javascript']],
  ['/src/core/private-room-voice-session.js', ['src/core/private-room-voice-session.js', 'text/javascript']],
  ['/src/core/livekit-browser-voice-adapter.js', ['src/core/livekit-browser-voice-adapter.js', 'text/javascript']],
  ['/sdk.js', ['scripts/table-talk/node_modules/livekit-client/dist/livekit-client.umd.js', 'text/javascript']],
]);
let admissions = 0, closing = false;
const deadline = Date.now() + 10 * 60_000;
const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(self)');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss://*.livekit.cloud https://*.livekit.cloud; media-src 'self' blob:; frame-ancestors 'none'");
  if (request.headers.host !== '127.0.0.1:4192') { response.writeHead(403).end(); return; }
  try {
    if (request.method === 'POST' && request.url === '/join') {
      request.resume();
      if (request.headers.origin !== origin || closing || Date.now() >= deadline || admissions >= 2) {
        response.writeHead(403).end(); return;
      }
      ++admissions;
      const token = new AccessToken(secrets.LIVEKIT_API_KEY, secrets.LIVEKIT_API_SECRET, {
        identity: randomUUID(), ttl: 60,
      });
      token.addGrant({ room, roomJoin: true, canSubscribe: true, canPublish: true,
        canPublishSources: [TrackSource.MICROPHONE], canPublishData: false, canUpdateOwnMetadata: false });
      const jwt = await token.toJwt();
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ url: secrets.LIVEKIT_URL, token: jwt }));
      return;
    }
    const asset = request.method === 'GET' && routes.get(request.url);
    if (!asset) { request.resume(); response.writeHead(404).end(); return; }
    const bytes = await readFile(new URL(asset[0], root));
    response.writeHead(200, { 'Content-Type': asset[1] }); response.end(bytes);
  } catch { response.writeHead(503).end('Voice test unavailable'); }
});
async function stop() {
  if (closing) return;
  closing = true; server.close();
  try { await provider.deleteRoom(room); console.log('Feasibility room cleanup confirmed'); }
  catch { console.log('Feasibility room cleanup unconfirmed; check LiveKit sessions before another test'); }
  process.exit(0);
}
// This wall-clock timer belongs to an isolated media probe, not gameplay timing.
setTimeout(stop, 10 * 60_000).unref();
process.on('SIGINT', stop); process.on('SIGTERM', stop);
server.listen(4192, '127.0.0.1', () => console.log(`Local voice probe: ${origin}`));
