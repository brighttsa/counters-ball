export function createAuthoritativeRoomController({matchId,mySide,initial,adapter,send,read,
  socketFactory,onStatus=()=>{},onEnd=()=>{},onRoom=()=>{},pollMs=2500,retryMs=1500}) {
  let state=initial,closed=false,pending=false,applying=false,recovery=false,chain=Promise.resolve(),retryTimer=null,wakeRetry=null;
  adapter.apply(initial);
  const lock=()=>adapter.lock(closed || pending || applying || recovery || state.rules.phase==='ended');
  const receive=message=>{
    chain=chain.then(async()=>{
      const next=message?.state;
      if(!closed && message?.room?.matchId===matchId)onRoom(message.room);
      if(closed || message?.matchId!==matchId || next?.version!=='server-v1' || next.levelId!==state.levelId
        || !Number.isInteger(next.seq) || next.seq<=state.seq)return;
      applying=true;lock();
      try {
        if(!recovery && next.seq===state.seq+1 && next.lastShot)await adapter.play(next);
        if(closed)return;
        adapter.apply(next);state=next;recovery=false;
        if(state.rules.phase==='ended'){clearInterval(timer);socket?.close();onEnd(state.result);}
      } finally {applying=false;if(!closed)lock();}
    }).catch(()=>{if(!closed){recovery=true;lock();onStatus('recovery');}});
    return chain;
  };
  const socket=socketFactory(message=>{if(message.type==='authoritative-shot'||message.room)void receive(message);});
  const refresh=async()=>{try{await receive(await read());}catch{if(!closed)onStatus('reconnecting');}};
  const timer=setInterval(()=>{if(!closed)void refresh();},pollMs);
  const retry=()=>new Promise(resolve=>{wakeRetry=resolve;retryTimer=setTimeout(()=>{wakeRetry=null;resolve();},retryMs);});
  lock();
  return {
    get state(){return state;},refresh,
    async flick(cap,vx,vz){
      if(closed || pending || applying || recovery || state.rules.phase!=='aiming' || state.rules.turn!==mySide)return false;
      if(!Number.isInteger(cap) || cap<(mySide==='home'?0:5) || cap>(mySide==='home'?4:9)
        || ![vx,vz].every(Number.isFinite))return false;
      pending=true;lock();onStatus('pending');
      const requestId=Array.from(crypto.getRandomValues(new Uint8Array(16)),byte=>byte.toString(16).padStart(2,'0')).join('');
      const intent={matchId,requestId,seq:state.seq,cap,vx,vz};
      try {
        while(!closed){
          try{await receive(await send(intent));return !closed;}
          catch(error){
            if(closed)return false;
            if(error.status && error.status<500 && error.status!==429){await refresh();onStatus('rejected');return false;}
            onStatus('reconnecting');await retry();
          }
        }
        return false;
      } finally {pending=false;if(!closed)lock();}
    },
    close(){if(closed)return;closed=true;clearInterval(timer);clearTimeout(retryTimer);wakeRetry?.();socket?.close();adapter.close?.();},
  };
}
