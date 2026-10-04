export const RANKED_OUTBOX='room:ranked-outbox';
const LIFETIME=30*86400000;
export function rankedResultJob(room,now=Date.now()){
  if(room.ranked?.kind!=='ranked')return null;
  if(!/^[a-km-np-zA-HJ-NP-Z2-9]{10}$/.test(room.id??''))throw Error('Ranked room identity missing');
  return {roomId:room.id,matchId:room.epoch,action:'settle',attempts:0,nextAt:now+1000};
}
// Never hold the room lock during delivery: the coordinator reads this room's receipt.
export async function deliverRankedResult(ctx,env,now=Date.now()){
  const job=await ctx.blockConcurrencyWhile(()=>ctx.storage.get(RANKED_OUTBOX));
  if(!job)return false;
  if(job.nextAt>now){await ctx.storage.setAlarm(job.nextAt);return true;}
  let acknowledgement=null;
  try{
    const coordinator=env.KONK_MATCH.get(env.KONK_MATCH.idFromName('ranked-standings-v1'));
    const response=await coordinator.fetch(`https://match/internal/ranked/${job.action}`,{
      method:'POST',body:JSON.stringify({roomId:job.roomId,matchId:job.matchId}),
      signal:AbortSignal.timeout(8000),
    });
    if(response.ok){
      const result=await response.json();
      if(result.registration?.matchId===job.matchId&&result.registration?.roomId===job.roomId
        &&['settled','void','unranked'].includes(result.status))acknowledgement=result;
    }
  }catch{}
  await ctx.blockConcurrencyWhile(async()=>{
    const current=await ctx.storage.get(RANKED_OUTBOX);
    if(!current||current.matchId!==job.matchId||current.action!==job.action)return;
    if(acknowledgement){
      const receipt=await ctx.storage.get('room:verified-result');
      const writes={[RANKED_OUTBOX]:null};
      if(receipt?.matchId===job.matchId)writes['room:verified-result']={...receipt,
        rated:acknowledgement.status==='settled',ratingDelta:acknowledgement.delta??null,
        ratingStatus:acknowledgement.status};
      await ctx.storage.put(writes);
      await ctx.storage.setAlarm(now+LIFETIME);
    }else{
      const attempts=current.attempts+1;
      const retry={...current,attempts,nextAt:now+Math.min(300000,1000*2**Math.min(attempts,9))};
      await ctx.storage.put({[RANKED_OUTBOX]:retry});
      await ctx.storage.setAlarm(retry.nextAt);
    }
  });
  return true;
}
