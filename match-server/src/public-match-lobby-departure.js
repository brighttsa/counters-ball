import { publicRoom, seatFor } from './live-match-room-rules.js';
import { broadcastLiveRoom } from './live-room-websocket-session.js';

export async function leavePublicMatchLobby(ctx, request) {
  const room = await ctx.storage.get('room');
  const { token } = await request.json();
  const seat = seatFor(room, token);
  let status = 200;
  let body;
  if (!seat) { status = 403; body = { error: 'not your seat' }; }
  else if (!room.matchmaking || !['lobby', 'cancelled'].includes(room.phase)) {
    status = 409; body = { error: 'match has already started' };
  } else {
    room.phase = 'cancelled';
    for (const player of Object.values(room.seats)) if (player) player.ready = false;
    room.updatedAt = Date.now();
    await ctx.storage.put('room', room);
    broadcastLiveRoom(ctx, room);
    body = { room: publicRoom(room) };
  }
  return Response.json(body, { status });
}
