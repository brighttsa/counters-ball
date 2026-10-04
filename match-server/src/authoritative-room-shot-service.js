import { createClassicState, simulateClassicShot, SIMULATION_VERSION } from './authoritative-classic-match-simulation.js';
import { seatFor, publicRoom } from './live-match-room-rules.js';
import { broadcastLiveRoom } from './live-room-websocket-session.js';
import { RANKED_OUTBOX,rankedResultJob } from './ranked-result-outbox.js';
import {startRankedTurn} from './ranked-abandonment-policy.js';

const json=(body,status=200)=>Response.json(body,{status});
const STATE='room:authoritative-state';
const KEYS=new Set(['token','matchId','requestId','seq','cap','vx','vz']);

// The caller holds the room's concurrency lock across read/simulate/commit.
export async function authoritativeRoomShot(ctx,request,room) {
  if (room?.simulation!==SIMULATION_VERSION || room.mode==='tournament') return json({error:'server simulation is not enabled for this room'},409);
  const reading=request.method==='GET';
  if (!reading && request.method!=='POST') return json({error:'method not allowed'},405);
  const body=reading?null:await request.json();
  const token=reading?request.headers.get('Authorization')?.replace(/^Bearer /i,''):body?.token;
  const seat=seatFor(room,token);
  if (!seat) return json({error:'not your seat'},403);
  if (!reading && (!body || Array.isArray(body) || Object.keys(body).some(key=>!KEYS.has(key))
    || typeof body.requestId!=='string' || !/^[a-f0-9]{32}$/.test(body.requestId))) {
    return json({error:'submit only a shot intent, not scores or table positions'},400);
  }
  if (!reading && body.matchId!==room.epoch) return json({error:'stale match identity'},409);
  const intent=reading?null:{requestId:body.requestId,seq:body.seq,cap:body.cap,vx:body.vx,vz:body.vz};
  const receiptKey=reading?null:`room:shot:${room.epoch}:${body.requestId}`;
  const receipt=reading?null:await ctx.storage.get(receiptKey);
  if (receipt) {
    const pending=await ctx.storage.get(RANKED_OUTBOX);
    if(pending)await ctx.storage.setAlarm(pending.nextAt);
    return receipt.seat===seat && JSON.stringify(receipt.intent)===JSON.stringify(intent)
      ? json(receipt.response) : json({error:'conflicting shot retry'},409);
  }
  if (!['ready','playing','ended'].includes(room.phase)) return json({error:'match has not started'},409);
  const stored=await ctx.storage.get(STATE);
  if (!stored && room.phase==='ended') return json({error:'match checkpoint unavailable'},409);
  let state=stored??createClassicState(room.levelId);
  if (reading) {
    if (!stored) await ctx.storage.put({[STATE]:state});
    return json({matchId:room.epoch,state,room:publicRoom(room)});
  }
  if (room.phase==='ended') return json({error:'match has ended'},409);
  try { state=simulateClassicShot(state,seat,intent); }
  catch(error) { return json({error:error.message,seq:state.seq},error.status??500); }
  room.phase=state.rules.phase==='ended'?'ended':'playing';room.updatedAt=Date.now();
  if(!state.result)startRankedTurn(room,room.updatedAt,Math.round((state.lastShot?.frames?.at(-1)?.time??0)*1000)+(state.goal?2500:0));
  const response={matchId:room.epoch,state,room:publicRoom(room)};
  const entries={[STATE]:state,[receiptKey]:{seat,intent,response},room};
  if (state.result) entries['room:verified-result']={matchId:room.epoch,version:SIMULATION_VERSION,finishedAt:room.updatedAt,
    levelId:room.levelId,seq:state.seq,result:state.result,serverVerified:true,rated:false,
    participants:Object.fromEntries(['home','away'].map(side=>[side,room.seats[side]?.profileId??null]))};
  // One multi-key write persists the checkpoint, acknowledgement and final receipt together.
  const job=state.result?rankedResultJob(room,room.updatedAt):null;
  if(job)entries[RANKED_OUTBOX]=job;
  await ctx.storage.put(entries);
  await ctx.storage.setAlarm(job?.nextAt??Date.now()+(room.ranked?.active?10000:30*24*60*60*1000));
  broadcastLiveRoom(ctx,room,{type:'authoritative-shot',...response});
  return json(response,stored?200:201);
}
