import {createRoom,joinRoom,newRoom,publicRoom,cleanRoomName} from './live-match-room-rules.js';
import {rankedSearchStorage} from './ranked-search-storage.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const coordinator=env=>env.KONK_MATCH.get(env.KONK_MATCH.idFromName('ranked-standings-v1'));
export async function recoverRankedSearches(ctx,env,now=Date.now()){
  const store=rankedSearchStorage(ctx);store.expire(now);
  const seen=new Set();
  for(const entry of store.pending()){
    if(seen.has(entry.job.id))continue;seen.add(entry.job.id);
    try{await recoverPair(store,env,entry,now);}catch{}
  }
  if(store.hasEntries())await ctx.storage.setAlarm(now+60000);
}
async function recoverPair(store,env,entry,now){
  const {id,room,tickets}=entry.job;
  const stub=env.KONK_MATCH.get(env.KONK_MATCH.idFromName(id));
  const installed=await stub.fetch('https://match/internal/ranked/install',{method:'POST',body:JSON.stringify({room}),signal:AbortSignal.timeout(8000)});
  if(!installed.ok)return json({error:'Ranked table is still opening; retry this search'},503);
  const response=await coordinator(env).fetch('https://match/internal/ranked/reserve',{
    method:'POST',body:JSON.stringify({roomId:id,matchId:room.epoch}),signal:AbortSignal.timeout(8000)});
  if(!response.ok&&response.status!==409)return json({error:'Ranked eligibility is still being checked; retry this search'},503);
  const reservation=await response.json();
  if(!response.ok||reservation.status!=='reserved'){
    store.put(tickets.map(ticket=>({...store.get(ticket),state:'blocked',expires:now+120000,error:reservation.reason??reservation.error??'Ranked pairing is not eligible'})));
    return json({state:'blocked',error:reservation.reason??reservation.error??'Ranked pairing is not eligible'},409);
  }
  if(reservation.registration?.matchId!==room.epoch||reservation.registration?.roomId!==id)return json({error:'Ranked reservation identity mismatch'},503);
  const activated=await stub.fetch('https://match/internal/ranked/activate',{method:'POST',body:JSON.stringify({matchId:room.epoch}),signal:AbortSignal.timeout(8000)});
  if(!activated.ok)return json({error:'Ranked table activation pending; retry search'},503);
  store.put(tickets.map((ticket,index)=>{
    const seat=index===0?'home':'away';
    return {...store.get(ticket),state:'matched',job:null,expires:now+120000,
      result:{id,seat,token:room.seats[seat].token,room:publicRoom(room,now),ranked:true}};
  }));
  return json({state:'matched',...store.get(entry.ticket).result});
}
// The queue object serializes requests. Caller identity/name are verified by the worker.
export async function handleRankedMatchmaking(ctx,env,body,now=Date.now()){
  if(env.RANKED_SETTLEMENT_ENABLED!=='true')return json({error:'Ranked play is not released'},409);
  if(!/^[a-f0-9]{36}$/.test(body?.ticket??'')||!/^[a-f0-9]{32}$/.test(body?.verifiedProfileId??'')
    ||!['join','poll','cancel'].includes(body.action))return json({error:'Invalid ranked search'},400);
  await ctx.storage.put('ranked-search-indexed',true);await ctx.storage.setAlarm(now+60000);
  const store=rankedSearchStorage(ctx);store.expire(now);
  let entry=store.get(body.ticket);
  if(entry&&entry.profile!==body.verifiedProfileId)return json({error:'Not your search'},403);
  if(entry?.state==='pairing')return recoverPair(store,env,entry,now);
  if(entry?.state==='matched')return json({state:'matched',...entry.result});
  if(entry?.state==='blocked')return json({state:'blocked',error:entry.error},409);
  if(body.action==='cancel'){
    store.put([{...entry,ticket:body.ticket,profile:body.verifiedProfileId,state:'cancelled',rating:entry?.rating??1000,joined:entry?.joined??now,expires:now+120000}]);
    return json({state:'cancelled'});
  }
  if(entry?.state==='cancelled')return json({state:'cancelled'});
  if(!entry&&body.action==='poll')return json({state:'expired'});
  if(!entry){
    const active=store.active(body.verifiedProfileId);if(active)return json({error:'A ranked search is already active'},409);
    const response=await coordinator(env).fetch('https://match/internal/ranked/standing',{method:'POST',body:JSON.stringify({profileId:body.verifiedProfileId}),signal:AbortSignal.timeout(8000)});
    if(!response.ok)return json({error:'Ranked rating unavailable'},503);
    const standing=await response.json();
    if(standing.own?.activeMatch)return json({error:'Finish your current ranked match first',roomId:standing.own.activeMatch},409);
    const rating=standing.own?.rating??1000;
    if(!Number.isFinite(rating))return json({error:'Invalid ranked rating'},503);
    entry={ticket:body.ticket,profile:body.verifiedProfileId,name:cleanRoomName(body.verifiedName),rating,state:'waiting',joined:now,expires:now+20000};
  }
  entry.expires=now+20000;store.put([entry]);
  const rival=store.rival(entry,now);
  if(!rival)return json({state:'waiting'});
  const id=newRoom(),room=createRoom({levelId:'schoolyard',homeName:rival.name,now});
  joinRoom(room,{name:entry.name,now});
  room.id=id;room.matchmaking=true;room.simulation='server-v1';room.ranked={kind:'ranked',startedAt:now};
  room.seats.home.profileId=rival.profile;room.seats.away.profileId=entry.profile;
  const job={id,room,tickets:[rival.ticket,entry.ticket]};
  store.put([rival,entry].map(value=>({...value,state:'pairing',job})));
  return recoverPair(store,env,store.get(entry.ticket),now);
}
