import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';

export function createVoiceProvider(env) {
  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) throw new Error('voice provider unavailable');
  const httpUrl = env.LIVEKIT_URL.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
  const rooms = new RoomServiceClient(httpUrl, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  return {
    async createRoom(name) {
      await rooms.createRoom({ name, emptyTimeout: 60, departureTimeout: 30, maxParticipants: 4 });
    },
    async token({ room, identity, displayName }) {
      const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET,
        { identity, name: displayName, ttl: 45 });
      token.addGrant({ roomJoin: true, room, canSubscribe: true, canPublish: true,
        canPublishSources: [TrackSource.MICROPHONE], canPublishData: false,
        canUpdateOwnMetadata: false });
      return token.toJwt();
    },
    async revoke(room, identity, now = Date.now()) {
      const cutoff = BigInt(Math.floor(now / 1000) + 1);
      await rooms.removeParticipant(room, identity, { revokeTokenTs: cutoff });
    },
    async deleteRoom(name) { await rooms.deleteRoom(name); },
  };
}
