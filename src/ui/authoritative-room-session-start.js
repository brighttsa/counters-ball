import { readAuthoritativeRoom, sendAuthoritativeShot } from '../core/authoritative-room-shot-transport.js';
import { createAuthoritativeRoomController } from '../core/authoritative-room-controller.js?v=2';
import { connectLiveRoomSocket } from '../core/live-match-room-transport.js?v=7';
import { createAuthoritativeCheckpointPlayback } from '../gameplay/authoritative-room-checkpoint-playback.js';
import { createRankedMatchClock } from './ranked-match-clock.js';
import { showRankedFullTimeRating } from './ranked-full-time-rating.js';

export async function startAuthoritativeRoomSession({api,index,id,mySide,names,openTable,hud,sound,app,menus}) {
  try {
    const initial=await readAuthoritativeRoom(api,id);
    if(initial.state.version!=='server-v1' || initial.state.levelId!==index.id)throw Error('Wrong server venue');
    openTable(index,mySide,names,initial.state.seq,true,null,true);
    const adapter=createAuthoritativeCheckpointPlayback(app.session,mySide);
    const clock=createRankedMatchClock(initial.room);
    const closeAdapter=adapter.close.bind(adapter);
    adapter.close=()=>{clock.close();closeAdapter();};
    let controller;
    try {
      controller=createAuthoritativeRoomController({matchId:initial.matchId,mySide,initial:initial.state,adapter,
        read:()=>readAuthoritativeRoom(api,id),send:intent=>sendAuthoritativeShot(api,id,intent),
        socketFactory:callback=>connectLiveRoomSocket(api,id,callback),
        onRoom(room){
          clock.update(room);
          if(room.ranked && room.phase==='cancelled'){
            controller?.close();menus.show('live-room');hud.show(false);
            document.getElementById('live-room-status').textContent='Ranked match void. No rating change. Search again when both players can connect.';
          }
        },onEnd:()=>{
          clock.close();
          if(initial.room.ranked)void Promise.resolve().then(()=>showRankedFullTimeRating(api,initial.matchId));
        },
        onStatus(status){
          const messages={pending:['SENDING YOUR FLICK','Waiting for the table.'],
            reconnecting:['RECONNECTING','Your flick will be retried safely.'],
            recovery:['RESTORING THE TABLE','Fetching the latest server checkpoint.'],
            rejected:['FLICK NOT ACCEPTED','The latest server state is authoritative.']};
          const [label,detail]=messages[status];hud.event(label,{priority:6,duration:2,detail});
        },
      });
      adapter.setSubmit((cap,vx,vz)=>controller.flick(cap,vx,vz));
    } catch(error){adapter.close();throw error;}
    sound.whistle();hud.event('SERVER TABLE',{priority:6,duration:2,detail:'Both players share one verified match.'});
    return controller;
  } catch(error) {
    menus.show('live-room');hud.show(false);
    document.getElementById('live-room-status').textContent='Could not restore this server table. Reopen the invite to retry.';
    return null;
  }
}
