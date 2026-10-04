import {rankedAbandonment} from './ranked-abandonment-policy.js';
import {createClassicState} from './authoritative-classic-match-simulation.js';
import {RANKED_OUTBOX,rankedResultJob} from './ranked-result-outbox.js';
import {broadcastLiveRoom} from './live-room-websocket-session.js';
// The caller holds the room lock; result delivery must run after it releases that lock.
export async function tickRankedRoom(ctx,now=Date.now()){
  const room=await ctx.storage.get('room');
  if(!room?.ranked?.active)return false;
  if(['ended','cancelled'].includes(room.phase)){
    const pending=await ctx.storage.get(RANKED_OUTBOX);
    if(pending)await ctx.storage.setAlarm(Math.max(now+1,pending.nextAt));
    return Boolean(pending);
  }
  const stored=await ctx.storage.get('room:authoritative-state');
  const decision=rankedAbandonment(room,stored,now);
  if(!decision){await ctx.storage.put({room});await ctx.storage.setAlarm(now+10000);return true;}
  room.updatedAt=now;
  const job=rankedResultJob(room,now),entries={room,[RANKED_OUTBOX]:job};
  if(decision.kind==='void'){
    room.phase='cancelled';room.cancelReason=decision.reason;job.action='void';
    for(const player of Object.values(room.seats))player.ready=false;
  }else{
    const state=stored??createClassicState(room.levelId),winner=decision.forfeiter==='home'?'away':'home';
    const result={kind:'forfeit',forfeiter:decision.forfeiter,winner,reason:decision.reason,
      scores:{...state.rules.scores},flicksUsed:{...state.rules.flicksUsed},stars:0,starFlags:[false,false,false]};
    state.seq++;state.result=result;state.lastShot=null;state.goal=0;
    state.rules={...state.rules,phase:'ended'};room.phase='ended';
    entries['room:authoritative-state']=state;
    entries['room:verified-result']={matchId:room.epoch,version:'server-v1',levelId:room.levelId,
      seq:state.seq,result,serverVerified:true,rated:false,finishedAt:now,
      participants:Object.fromEntries(['home','away'].map(side=>[side,room.seats[side].profileId]))};
  }
  await ctx.storage.put(entries);await ctx.storage.setAlarm(job.nextAt);
  const state=entries['room:authoritative-state'];
  broadcastLiveRoom(ctx,room,state?{type:'authoritative-shot',matchId:room.epoch,state}:{type:'room'});
  return true;
}
