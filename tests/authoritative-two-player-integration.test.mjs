import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, THREE } from './helpers/real-three-session-fixture.mjs';
const { createClassicState, simulateClassicShot, classicLevel } = await import('../match-server/src/authoritative-classic-match-simulation.js');
import { createAuthoritativeCheckpointPlayback } from '../src/gameplay/authoritative-room-checkpoint-playback.js';
import { createAuthoritativeRoomController } from '../src/core/authoritative-room-controller.js';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function clientSession(state){
  const {s,calls}=fixture();
  const level=classicLevel(state.levelId);
  s.rules.rules=level.rules;s.physics.frictionScale=level.frictionScale;
  s.physics.bodies=[];s.entries=[];
  state.bodies.forEach((descriptor,i)=>{
    const data={...descriptor,x:state.table[i*4],z:state.table[i*4+1],mass:i<10?1:0.12};
    const body=i<11?s.physics.addBody(data):s.physics.addStaticCircle(data);
    if(i<10)s.entries.push({side:body.side,body,home:[data.x,data.z],pivot:new THREE.Object3D(),mesh:new THREE.Object3D()});
    if(i===10)s.ballBody=body;
  });
  return {s,calls};
}
function pair(initial,{loseAcknowledgement=false}={}){
  let server=structuredClone(initial),commits=0,lost=false;
  const sockets={},clients={},receipts=new Map();
  const packet=()=>({matchId:'integration',state:structuredClone(server)});
  for(const side of ['home','away']){
    const {s,calls}=clientSession(initial);let ends=0;
    const adapter=createAuthoritativeCheckpointPlayback(s,side);
    const controller=createAuthoritativeRoomController({matchId:'integration',mySide:side,initial:structuredClone(initial),adapter,
      pollMs:100000,retryMs:1,onEnd:()=>ends++,read:async()=>packet(),
      socketFactory:callback=>{sockets[side]=callback;return {close(){delete sockets[side];}};},
      send:async intent=>{
        const key=side+intent.requestId;
        if(receipts.has(key))return structuredClone(receipts.get(key));
        server=simulateClassicShot(server,side,intent);commits++;
        const accepted=packet();receipts.set(key,accepted);
        if(loseAcknowledgement&&!lost){lost=true;throw Error('Connection lost after commit');}
        for(const receive of Object.values(sockets))receive({type:'authoritative-shot',...accepted});
        return accepted;
      }});
    adapter.setSubmit((cap,vx,vz)=>controller.flick(cap,vx,vz));
    clients[side]={s,calls,controller,get ends(){return ends;}};
  }
  return {clients,get server(){return server;},get commits(){return commits;},
    close(){Object.values(clients).forEach(c=>c.controller.close());}};
}
async function drain(pair,promise){
  let done=false,failure;
  promise.then(()=>{done=true;},error=>{failure=error;done=true;});
  for(let frame=0;frame<1000&&!done;frame++){
    await tick();for(const {s}of Object.values(pair.clients))s.update(0.1,frame*0.1);
  }
  assert.equal(done,true,'controller must finish playback');if(failure)throw failure;
  await tick();
}
function assertParity(pair){
  for(const {s,controller}of Object.values(pair.clients)){
    assert.deepEqual(controller.state,pair.server);
    assert.deepEqual(Array.from(s.physics.snapshot()),pair.server.table);
    assert.deepEqual(s.rules.snapshot(),pair.server.rules);
  }
}
for(const venue of ['schoolyard','kiosk','veranda','roadside','harmattan','nightbulb']){
  test(`${venue}: two real sessions agree through regulation, tiebreak and full time`,async()=>{
    const p=pair(createClassicState(venue));try{
      while(p.server.rules.phase!=='ended'){
        const side=p.server.rules.turn;
        await drain(p,p.clients[side].controller.flick(side==='home'?0:5,0.001,0));
        assertParity(p);assert.ok(p.commits<60);
      }
      assert.equal(p.clients.home.ends,1);assert.equal(p.clients.away.ends,1);
      assert.equal(await p.clients.home.controller.flick(0,1,0),false);
      await p.clients.home.controller.refresh();assert.equal(p.clients.home.ends,1);
    }finally{p.close();}
  });
}
for(const venue of ['schoolyard','kiosk']){
  test(`${venue}: goal celebration reconciles winner or conceder kickoff`,async()=>{
    const state=createClassicState(venue);
    state.table[12]=1.15;state.table[13]=0;state.table[40]=1.3;state.table[41]=0;
    state.table[20]=1.3;state.table[21]=0.6;
    const p=pair(state);try{
      await drain(p,p.clients.home.controller.flick(3,3,0));assertParity(p);
      assert.equal(p.server.rules.scores.home,1);
      assert.equal(p.server.rules.phase,venue==='schoolyard'?'ended':'aiming');
      for(const {calls}of Object.values(p.clients))assert.equal(calls.filter(c=>c[0]==='hud.goal').length,1);
    }finally{p.close();}
  });
}
test('lost accepted response retries once logically and opponent recovers missed broadcast',async()=>{
  const p=pair(createClassicState('veranda'),{loseAcknowledgement:true});try{
    await drain(p,p.clients.home.controller.flick(0,0.001,0));
    assert.equal(p.commits,1);assert.equal(p.clients.away.controller.state.seq,0);
    await drain(p,p.clients.away.controller.refresh());assertParity(p);
    await drain(p,p.clients.away.controller.flick(5,0.001,0));assertParity(p);
  }finally{p.close();}
});
