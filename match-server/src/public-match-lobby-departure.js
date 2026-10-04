import { publicRoom, seatFor } from './live-match-room-rules.js';
import { broadcastLiveRoom } from './live-room-websocket-session.js';
import {rankedResultJob,RANKED_OUTBOX} from './ranked-result-outbox.js';

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
    if(room.phase==='cancelled')return Response.json({room:publicRoom(room)});
    room.phase = 'cancelled';
    for (const player of Object.values(room.seats)) if (player) player.ready = false;
    room.updatedAt = Date.now();
    if(room.ranked?.active){
      room.cancelReason='lobby-departure';const job={...rankedResultJob(room),action:'void'};
      await ctx.storage.put({room,[RANKED_OUTBOX]:job});await ctx.storage.setAlarm(job.nextAt);
    }else await ctx.storage.put('room', room);
    broadcastLiveRoom(ctx, room);
    body = { room: publicRoom(room) };
  }
  return Response.json(body, { status });
}
