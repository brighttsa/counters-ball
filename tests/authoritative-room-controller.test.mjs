import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthoritativeRoomController } from '../src/core/authoritative-room-controller.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const state=(seq=0,turn='home',ended=false)=>({version:'server-v1',levelId:'schoolyard',seq,
  rules:{phase:ended?'ended':'aiming',turn},lastShot:{side:seq%2?'home':'away'},result:ended?{winner:'home'}:null});
function fixture(overrides={}) {
  let deliver,read=state(),requests=[],applied=[],ended=0,locked=[];
  const controller=createAuthoritativeRoomController({matchId:'match',mySide:'home',initial:state(),
    adapter:{apply:s=>applied.push(s.seq),play:async()=>{},lock:value=>locked.push(value)},
    send:async intent=>{requests.push(intent);return {matchId:'match',state:state(1,'away')};},
    read:async()=>({matchId:'match',state:read}),socketFactory:callback=>{deliver=callback;return {close(){}};},
    onEnd:()=>ended++,onStatus:()=>{},pollMs:100000,retryMs:1,...overrides});
  return {controller,requests,applied,locked,deliver:message=>deliver(message),setRead:value=>{read=value;},get ended(){return ended;}};
}
test('HTTP and WebSocket duplicate acknowledgements apply a shot once',async()=>{
  const f=fixture();try{
    await f.controller.flick(3,1,0);
    f.deliver({type:'authoritative-shot',matchId:'match',state:state(1,'away')});await tick();
    assert.deepEqual(f.applied,[0,1]);assert.equal(f.requests.length,1);
    assert.equal(f.requests[0].seq,0);assert.equal(f.controller.state.seq,1);
  }finally{f.controller.close();}
});
test('network retries reuse the exact request ID and prevent another pending flick',async()=>{
  let attempts=0,ids=[];
  const f=fixture({send:async intent=>{ids.push(intent.requestId);if(++attempts===1)throw Error('offline');return {matchId:'match',state:state(1,'away')};}});
  try{const pending=f.controller.flick(3,1,0);assert.equal(await f.controller.flick(4,1,0),false);
    await pending;assert.equal(attempts,2);assert.equal(new Set(ids).size,1);
  }finally{f.controller.close();}
});
test('out-of-order checkpoints and foreign matches never regress the table',async()=>{
  const f=fixture();try{
    f.deliver({type:'authoritative-shot',matchId:'match',state:state(2,'home')});await tick();
    f.deliver({type:'authoritative-shot',matchId:'other',state:state(3,'away')});
    f.deliver({type:'authoritative-shot',matchId:'match',state:state(1,'away')});await tick();
    assert.deepEqual(f.applied,[0,2]);
  }finally{f.controller.close();}
});
test('HTTP recovery catches a missed socket event and full time happens only once',async()=>{
  const f=fixture();try{
    f.setRead(state(2,'home',true));await f.controller.refresh();await f.controller.refresh();
    assert.equal(f.ended,1);assert.equal(await f.controller.flick(3,1,0),false);
  }finally{f.controller.close();}
});
test('closing while a request is in flight does not mutate or unlock the abandoned session',async()=>{
  let release;
  const f=fixture({send:()=>new Promise(resolve=>{release=resolve;})});
  const pending=f.controller.flick(3,1,0);f.controller.close();
  release({matchId:'match',state:state(1,'away')});await pending;
  assert.deepEqual(f.applied,[0]);
});
test('failed playback locks input until a canonical refresh succeeds',async()=>{
  const applied=[],locked=[];
  const f=fixture({adapter:{apply:s=>applied.push(s.seq),play:async()=>{throw Error('bad trajectory');},lock:v=>locked.push(v)}});
  try{
    await f.controller.flick(3,1,0);
    assert.equal(await f.controller.flick(3,1,0),false);
    assert.equal(locked.at(-1),true);
    f.setRead(state(1,'away'));await f.controller.refresh();
    assert.deepEqual(applied,[0,1]);assert.equal(locked.at(-1),false);
  }finally{f.controller.close();}
});
