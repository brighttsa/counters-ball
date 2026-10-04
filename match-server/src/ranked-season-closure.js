import {rankedLedgerContext} from './ranked-ledger-sql-storage.js';
import {settleRankedResult} from './ranked-result-settlement-service.js';
import {releaseRankedReservation} from './ranked-reservation-release.js';
import {rankedSeason,GRACE_MS} from './ranked-rating-rules.js';
import {rankedResultJob,RANKED_OUTBOX} from './ranked-result-outbox.js';
import {rankedSource} from './ranked-internal-coordinator.js';
import {broadcastLiveRoom} from './live-room-websocket-session.js';

// Called under the room lock; never calls back into the ledger.
export async function closeRankedRoom(ctx,env,request,now=Date.now()){
  if(env.RANKED_SETTLEMENT_ENABLED!=='true')return Response.json({error:'Ranked is not released'},{status:409});
  const {matchId}=await request.json(),room=await ctx.storage.get('room');
  if(!room||room.epoch!==matchId||room.ranked?.kind!=='ranked')return Response.json({error:'Stale ranked room'},{status:409});
  const season=rankedSeason(room.ranked.startedAt,Date.parse(env.RANKED_SEASON_ANCHOR));
  if(now<=season.end+GRACE_MS)return Response.json({error:'Season grace has not ended'},{status:409});
  if(!await ctx.storage.get('room:verified-result')&&room.phase!=='cancelled'){
    room.phase='cancelled';room.cancelReason='season-cutoff';room.updatedAt=now;
    const job={...rankedResultJob(room,now),action:'void'};
    await ctx.storage.put({room,[RANKED_OUTBOX]:job});await ctx.storage.setAlarm(job.nextAt);
    broadcastLiveRoom(ctx,room);
  }
  return rankedSource(ctx,matchId);
}
// Only canonical room closure/receipts may release a pending reservation.
export async function closeExpiredRankedReservations(ctx,env,now=Date.now()){
  if(env.RANKED_SETTLEMENT_ENABLED!=='true')return;
  const ledger=rankedLedgerContext(ctx),sql=ledger.storage.sql;
  // Two bounded fetches keep the coordinator lock below its platform timeout.
  const pending=[...sql.exec("SELECT * FROM ranked_reservations WHERE status='reserved' AND cutoff<? ORDER BY checked,cutoff,match_id LIMIT 2",now)];
  for(const row of pending){
    sql.exec('UPDATE ranked_reservations SET checked=? WHERE match_id=?',now,row.match_id);
    try{
      const stub=env.KONK_MATCH.get(env.KONK_MATCH.idFromName(row.room));
      const response=await stub.fetch('https://match/internal/ranked/close',{method:'POST',body:JSON.stringify({matchId:row.match_id}),signal:AbortSignal.timeout(8000)});
      if(!response.ok)continue;
      const source={...await response.json(),roomId:row.room};
      if(source.room?.epoch!==row.match_id)continue;
      if(source.receipt)await settleRankedResult(ledger,source,{now});
      else await releaseRankedReservation(ledger,source);
    }catch{/* Retain locks and retry when the canonical room can be read safely. */}
  }
  const next=[...sql.exec("SELECT MIN(cutoff) AS cutoff FROM ranked_reservations WHERE status='reserved'")][0]?.cutoff;
  if(next!==null&&next!==undefined)await ctx.storage.setAlarm(Math.max(now+60000,next+1));
}
