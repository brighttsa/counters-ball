import { seatFor,publicRoom } from './live-match-room-rules.js';
import { createClassicState } from './authoritative-classic-match-simulation.js';
import { broadcastLiveRoom } from './live-room-websocket-session.js';
export async function authoritativeRoomRematch(ctx,request){
  const room=await ctx.storage.get('room'),body=await request.json();
  const seat=seatFor(room,body?.token);
  if(!seat)return Response.json({error:'not your seat'},{status:403});
  if(room.simulation!=='server-v1'||room.matchmaking||room.mode==='tournament')return Response.json({error:'unsupported rematch'},{status:409});
  const starting=room.phase==='ended'&&body.matchId===room.epoch;
  if(!starting&&(body.matchId!==room.previousEpoch||!['lobby','ready','playing'].includes(room.phase)))
    return Response.json({error:'stale rematch'},{status:409});
  const entries={};
  if(starting){
    room.previousEpoch=room.epoch;room.epoch=crypto.randomUUID();room.phase='lobby';
    for(const player of Object.values(room.seats))if(player)player.ready=false;
    const result=await ctx.storage.get('room:verified-result');
    if(result)entries[`room:verified-result:${room.previousEpoch}`]=result;
    entries['room:verified-result']=null;
    entries['room:authoritative-state']=createClassicState(room.levelId);
  }
  if(room.phase==='lobby'){
    room.seats[seat].ready=true;room.seats[seat].seenAt=Date.now();
    if(room.seats.home?.ready&&room.seats.away?.ready)room.phase='ready';
  }
  room.updatedAt=Date.now();entries.room=room;
  await ctx.storage.put(entries);broadcastLiveRoom(ctx,room);
  return Response.json({room:publicRoom(room),seat});
}
