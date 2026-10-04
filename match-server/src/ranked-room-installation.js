export async function installRankedRoom(ctx,env,request){
  if(env.RANKED_SETTLEMENT_ENABLED!=='true')return Response.json({error:'Ranked play is not released'},{status:409});
  const {room}=await request.json();
  if(room?.simulation!=='server-v1'||room.ranked?.kind!=='ranked'||room.phase!=='lobby')return Response.json({error:'Invalid ranked room'},{status:400});
  const existing=await ctx.storage.get('room');
  if(existing)return Response.json({ok:existing.epoch===room.epoch},{status:existing.epoch===room.epoch?200:409});
  await ctx.storage.put({room});await ctx.storage.setAlarm(Date.now()+30*86400000);
  return Response.json({ok:true},{status:201});
}
export async function activateRankedRoom(ctx,env,request,now=Date.now()){
  if(env.RANKED_SETTLEMENT_ENABLED!=='true')return Response.json({error:'Ranked play is not released'},{status:409});
  const body=await request.json(),room=await ctx.storage.get('room');
  if(!room||room.epoch!==body.matchId||room.ranked?.kind!=='ranked')return Response.json({error:'Stale ranked room'},{status:409});
  if(!room.ranked.active){room.ranked.active=true;room.ranked.activatedAt=now;await ctx.storage.put({room});}
  await ctx.storage.setAlarm(now+10000);return Response.json({ok:true});
}
