import { PROFILE_ID,rankedSeason,GRACE_MS,freshRating,settleRatings,isPlaced } from './ranked-rating-rules.js';

const fail=(message,status=409)=>{throw Object.assign(Error(message),{status});};
const reservationKey=id=>`ranked:reservation:${id}`;
const recordKey=(season,id)=>`ranked:rating:${season}:${id}`;
const activeKey=id=>`ranked:active:${id}`;
const seasonRecord=async(storage,season,id)=>{
  const existing=await storage.get(recordKey(season.id,id));if(existing)return existing;
  if(season.index>0&&(await storage.get(`ranked:pending:${season.index-1}`)??0)>0)fail('Previous season results are still settling',503);
  const previous=season.index>0?await storage.get(recordKey(String(season.index-1),id)):null;
  return freshRating(previous);
};
function registration(source,anchor,now){
  const {roomId,room}=source;
  if(!/^[a-km-np-zA-HJ-NP-Z2-9]{10}$/.test(roomId??'') || typeof room?.epoch!=='string'
    || !/^[a-f0-9-]{36}$/.test(room.epoch))fail('Invalid match identity',400);
  if(room.simulation!=='server-v1'||!room.matchmaking||room.mode==='tournament'||room.ranked?.kind!=='ranked'
    || !['lobby','ready'].includes(room.phase))fail('Not a ranked registration');
  const participants=Object.fromEntries(['home','away'].map(side=>[side,room.seats[side]?.profileId]));
  if(!Object.values(participants).every(id=>PROFILE_ID.test(id??''))||participants.home===participants.away)fail('Ranked requires two distinct verified profiles');
  const startedAt=room.ranked.startedAt;
  if(!Number.isFinite(startedAt)||startedAt>now)fail('Invalid start time');
  const season=rankedSeason(startedAt,anchor);
  if(now>=season.end)fail('Registration window closed');
  return {matchId:room.epoch,roomId,levelId:room.levelId,version:'server-v1',participants,startedAt,season};
}
// Only trusted server callers may supply source. The caller holds one coordinator
// concurrency lock; both ratings and the consumed receipt use one atomic storage put.
export async function reserveRankedResult(ctx,source,{anchor,now=Date.now()}={}){
  const prior=await ctx.storage.get(reservationKey(source.room?.epoch));
  if(prior){
    const e=prior.registration,r=source.room;
    if(e.roomId!==source.roomId||e.levelId!==r.levelId||e.version!==r.simulation||e.startedAt!==r.ranked?.startedAt
      ||['home','away'].some(side=>e.participants[side]!==r.seats[side]?.profileId))fail('Conflicting ranked registration');
    return prior;
  }
  const entry=registration(source,anchor,now),storage=ctx.storage;
  const key=reservationKey(entry.matchId),existing=await storage.get(key);
  if(existing){
    if(JSON.stringify(existing.registration)!==JSON.stringify(entry))fail('Conflicting ranked registration');
    return existing;
  }
  for(const id of Object.values(entry.participants))if(await storage.get(activeKey(id)))fail('Profile already has an active ranked match');
  const pair=Object.values(entry.participants).sort().join(':'),day=Math.floor(entry.startedAt/86400000);
  const pairKey=`ranked:pair:${day}:${pair}`,count=await storage.get(pairKey)??0;
  const eligible=count<2;
  const reservation={registration:entry,status:eligible?'reserved':'unranked',reason:eligible?null:'daily-opponent-limit'};
  const writes={[key]:reservation};
  for(const side of ['home','away'])writes[`ranked:name:${entry.participants[side]}`]=source.room.seats[side]?.name??'KONKER';
  if(eligible){
    writes[pairKey]=count+1;
    const pendingKey=`ranked:pending:${entry.season.id}`;
    writes[pendingKey]=(await storage.get(pendingKey)??0)+1;
    for(const id of Object.values(entry.participants))writes[activeKey(id)]={matchId:entry.matchId,roomId:entry.roomId};
  }
  await storage.put(writes);return reservation;
}
export async function settleRankedResult(ctx,source,{now=Date.now()}={}){
  const storage=ctx.storage,{roomId,receipt}=source;
  if(!receipt?.matchId)fail('Missing server receipt',400);
  const key=reservationKey(receipt.matchId),reservation=await storage.get(key);
  if(!reservation)fail('Match was never reserved for ranked play');
  const entry=reservation.registration;
  if(roomId!==entry.roomId||receipt.version!==entry.version||receipt.levelId!==entry.levelId
    || receipt.serverVerified!==true || !Number.isInteger(receipt.seq)||receipt.seq<1
    || ['home','away'].some(side=>receipt.participants?.[side]!==entry.participants[side]))fail('Receipt identity does not match reservation');
  if(!Number.isFinite(receipt.finishedAt)||receipt.finishedAt<entry.startedAt||receipt.finishedAt>now)fail('Invalid completion time');
  const result=receipt.result,scores=result?.scores;
  if(!scores||!['home','away'].every(side=>Number.isInteger(scores[side])&&scores[side]>=0)
    || (result.kind==='forfeit'? !['home','away'].includes(result.forfeiter)||result.winner===(result.forfeiter)||!['home','away'].includes(result.winner)
      :result.winner!==(scores.home===scores.away?null:scores.home>scores.away?'home':'away')))fail('Invalid verified outcome');
  const fingerprint=JSON.stringify([receipt.seq,receipt.finishedAt,result.winner,scores.home,scores.away,result.kind??null,result.forfeiter??null]);
  if(reservation.fingerprint&&reservation.fingerprint!==fingerprint)fail('Conflicting result retry');
  if(reservation.status!=='reserved')return reservation;
  const writes={};
  const expired=receipt.finishedAt>entry.season.end+GRACE_MS;
  const completed={...reservation,status:expired?'void':'settled',reason:expired?'season-cutoff':null,fingerprint};
  if(!expired){
    const home=await seasonRecord(storage,entry.season,entry.participants.home);
    const away=await seasonRecord(storage,entry.season,entry.participants.away);
    const ratings=settleRatings(home,away,result.winner,entry.participants.home,entry.participants.away);
    for(const side of ['home','away']){
      const record=ratings[side];writes[recordKey(entry.season.id,entry.participants[side])]={...record,placed:isPlaced(record)};
    }
    completed.delta={home:ratings.delta,away:-ratings.delta};
  }
  for(const id of Object.values(entry.participants)){
    const active=await storage.get(activeKey(id));
    if(active?.matchId===entry.matchId)writes[activeKey(id)]=null;
  }
  const pendingKey=`ranked:pending:${entry.season.id}`;
  writes[pendingKey]=Math.max(0,(await storage.get(pendingKey)??0)-1);
  writes[key]=completed;await storage.put(writes);return completed;
}
