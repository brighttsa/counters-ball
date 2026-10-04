export function rankedClockLabel(room, elapsed=0) {
  const clock=room?.ranked;
  if(!clock || room.phase==='ended')return 'flicks left';
  if(room.phase==='cancelled')return 'Match void';
  if(clock.suspendedAt!==null && Number.isFinite(clock.suspendedAt))return 'Reconnect · paused';
  if(!Number.isFinite(clock.turnDeadline))return 'Ranked';
  const seconds=Math.max(0,Math.ceil((clock.turnDeadline-clock.serverNow-elapsed)/1000));
  return seconds?`${seconds}s · turn limit`:'Checking turn result…';
}

// This is presentation only: the server adjudicates expiry and reconnects.
export function createRankedMatchClock(initial, element=document.getElementById('flick-meter-label')) {
  if(!initial?.ranked)return {update(){},close(){}};
  let room=initial,received=performance.now();
  const draw=()=>{if(element && !element.classList.contains('turn-call'))
    element.textContent=rankedClockLabel(room,performance.now()-received);};
  const timer=setInterval(draw,250);draw();
  return {
    update(next){
      if(Number.isFinite(room?.ranked?.serverNow) && next?.ranked?.serverNow<room.ranked.serverNow)return;
      room=next;received=performance.now();draw();
    },
    close(){clearInterval(timer);if(element)element.textContent='flicks left';},
  };
}
