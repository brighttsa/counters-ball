export const RANKED_TURN_MS=60000,RANKED_RECONNECT_MS=90000,RANKED_LOBBY_MS=90000;
const online=(room,side,now)=>now-room.seats[side].seenAt<=15000;
export function startRankedTurn(room,now,duration=0){
  if(room.ranked?.active){room.ranked.turnDeadline=now+RANKED_TURN_MS+duration;delete room.ranked.suspendedAt;}
}
export function resumeRankedTurn(room,now){
  if(room.ranked?.suspendedAt!==undefined&&['home','away'].every(side=>online(room,side,now))){
    room.ranked.turnDeadline+=Math.max(0,now-room.ranked.suspendedAt);delete room.ranked.suspendedAt;
  }
}
// Missing players are not assumed to have won or lost until the grace period ends.
export function rankedAbandonment(room,state,now){
  if(!room?.ranked?.active||!['lobby','ready','playing'].includes(room.phase))return null;
  if(room.phase==='lobby')return now-room.ranked.activatedAt>=RANKED_LOBBY_MS?{kind:'void',reason:'lobby-timeout'}:null;
  const absent=['home','away'].filter(side=>!online(room,side,now));
  const expired=['home','away'].filter(side=>now-room.seats[side].seenAt>=RANKED_RECONNECT_MS);
  if(expired.length===2)return {kind:'void',reason:'both-disconnected'};
  if(expired.length===1&&absent.length===1)return {kind:'forfeit',forfeiter:expired[0],reason:'disconnect-timeout'};
  if(absent.length){
    room.ranked.suspendedAt??=Math.min(...absent.map(side=>room.seats[side].seenAt+15000));
    return null;
  }
  resumeRankedTurn(room,now);
  if(Number.isFinite(room.ranked.turnDeadline)&&now>=room.ranked.turnDeadline)
    return {kind:'forfeit',forfeiter:state?.rules?.turn??'home',reason:'turn-timeout'};
  return null;
}
