export async function releaseRankedReservation(ctx,source){
  const {roomId,room}=source,key=`ranked:reservation:${room?.epoch}`;
  const reservation=await ctx.storage.get(key);
  if(!reservation||reservation.registration.roomId!==roomId||room.phase!=='cancelled')throw Object.assign(Error('No cancelled ranked reservation'),{status:409});
  if(reservation.status!=='reserved')return reservation;
  const entry=reservation.registration,completed={...reservation,status:'void',reason:room.cancelReason??'cancelled'};
  const pendingKey=`ranked:pending:${entry.season.id}`,writes={[key]:completed,[pendingKey]:Math.max(0,(await ctx.storage.get(pendingKey)??0)-1)};
  for(const id of Object.values(entry.participants))if((await ctx.storage.get(`ranked:active:${id}`))?.matchId===room.epoch)writes[`ranked:active:${id}`]=null;
  await ctx.storage.put(writes);return completed;
}
