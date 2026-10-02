import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoiceProvider } from '../match-server/src/private-room-voice-provider.js';

test('provider issues a room-scoped microphone-only token without data or moderation grants', async () => {
  const provider = createVoiceProvider({ LIVEKIT_URL: 'wss://example.livekit.cloud', LIVEKIT_API_KEY: 'key', LIVEKIT_API_SECRET: 'secret' });
  const jwt = await provider.token({ room: 'konk-abcdefghij', identity: 'private-id', displayName: 'Ama' });
  const claims = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
  assert.equal(claims.sub, 'private-id');
  assert.equal(claims.name, 'Ama');
  assert.equal(claims.video.room, 'konk-abcdefghij');
  assert.equal(claims.video.roomJoin, true);
  assert.equal(claims.video.canSubscribe, true);
  assert.equal(claims.video.canPublish, true);
  assert.deepEqual(claims.video.canPublishSources, ['microphone']);
  assert.equal(claims.video.canPublishData, false);
  assert.equal(claims.video.roomAdmin, undefined);
  assert.equal(claims.exp - claims.nbf, 45);
});
