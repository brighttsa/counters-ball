import { reserveRankedResult,settleRankedResult } from './ranked-result-settlement-service.js';
import { rankedLedgerContext } from './ranked-ledger-sql-storage.js';
import { rankedStanding } from './ranked-standings-service.js';
import { releaseRankedReservation } from './ranked-reservation-release.js';
const ROOM=/^[a-km-np-zA-HJ-NP-Z2-9]{10}$/;
export async function rankedSource(ctx,matchId){
  const stored=await ctx.storage.get('room');
  const room=stored&&{epoch:stored.epoch,phase:stored.phase,levelId:stored.levelId,simulation:stored.simulation,
    mode:stored.mode,matchmaking:stored.matchmaking,ranked:stored.ranked,cancelReason:stored.cancelReason,
    seats:Object.fromEntries(['home','away'].map(side=>[side,{profileId:stored.seats[side]?.profileId,name:stored.seats[side]?.name}]))};
  const receipt=matchId===stored?.epoch?await ctx.storage.get('room:verified-result')
    :await ctx.storage.get(`room:verified-result:${matchId}`);
  return Response.json({room,receipt});
}
export async function handleRankedCoordinator(ctx,env,request){
  if(env.RANKED_SETTLEMENT_ENABLED!=='true')return Response.json({error:'ranked settlement is not released'},{status:409});
  try{
    const owner=ctx;
    const body=await request.json();
    if(ctx.storage.sql){await ctx.storage.put('ranked-ledger-sql',true);ctx=rankedLedgerContext(ctx);}
    const path=new URL(request.url).pathname;
    if(path.endsWith('/standing'))return Response.json(await rankedStanding(ctx,env,body));
    if(!ROOM.test(body?.roomId??'')||!/^[a-f0-9-]{36}$/.test(body?.matchId??''))throw Object.assign(Error('Invalid match identity'),{status:400});
    // Resolve the receipt from the match object, never from a submitted outcome.
    const stub=env.KONK_MATCH.get(env.KONK_MATCH.idFromName(body.roomId));
    const response=await stub.fetch(`https://match/internal/ranked-source?matchId=${body.matchId}`);
    if(!response.ok)throw Error('Match source unavailable');
    const source={...await response.json(),roomId:body.roomId};
    const reserve=new URL(request.url).pathname.endsWith('/reserve');
    if(reserve&&source.room?.epoch!==body.matchId)throw Object.assign(Error('Stale match'),{status:409});
    const anchor=Date.parse(env.RANKED_SEASON_ANCHOR??'');
    const result=reserve?await reserveRankedResult(ctx,source,{anchor}):path.endsWith('/void')?await releaseRankedReservation(ctx,source):await settleRankedResult(ctx,source);
    if(reserve&&result.status==='reserved'&&owner.storage.sql){
      const next=Math.max(Date.now()+60000,result.registration.season.end+600001),alarm=await owner.storage.getAlarm();
      if(alarm===null||alarm>next)await owner.storage.setAlarm(next);
    }
    return Response.json(result);
  }catch(error){return Response.json({error:error.message},{status:error.status??503});}
}
