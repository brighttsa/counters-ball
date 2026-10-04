export const SEASON_MS=28*24*60*60*1000,GRACE_MS=10*60*1000;
export const PROFILE_ID=/^[a-f0-9]{32}$/;
export function rankedSeason(startedAt,anchor){
  if(!Number.isFinite(startedAt)||!Number.isFinite(anchor)||startedAt<anchor)throw Error('Invalid ranked season');
  const index=Math.floor((startedAt-anchor)/SEASON_MS);
  return {id:String(index),index,start:anchor+index*SEASON_MS,end:anchor+(index+1)*SEASON_MS};
}
export function freshRating(previous){
  return {rating:previous?1000+0.5*(previous.rating-1000):1000,matches:0,wins:0,draws:0,losses:0,opponents:[]};
}
export function settleRatings(home,away,winner,homeId,awayId){
  if(![null,'home','away'].includes(winner))throw Error('Invalid winner');
  const score=winner===null?0.5:winner==='home'?1:0;
  const delta=24*(score-1/(1+10**((away.rating-home.rating)/400)));
  const update=(record,change,outcome,opponent)=>({...record,rating:record.rating+change,matches:record.matches+1,
    wins:record.wins+(outcome===1?1:0),draws:record.draws+(outcome===0.5?1:0),losses:record.losses+(outcome===0?1:0),
    // Only the distinct-opponent qualification threshold needs storage.
    opponents:record.opponents.includes(opponent)||record.opponents.length>=3?record.opponents:[...record.opponents,opponent]});
  return {home:update(home,delta,score,awayId),away:update(away,-delta,1-score,homeId),delta};
}
export const isPlaced=record=>record.matches>=5&&record.opponents.length>=3;
