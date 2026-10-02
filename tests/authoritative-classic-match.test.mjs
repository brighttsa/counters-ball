import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const three = pathToFileURL(process.env.COUNTERS_TEST_THREE ?? fileURLToPath(new URL('../match-server/node_modules/three/build/three.module.js', import.meta.url))).href;
registerHooks({ resolve(specifier, context, next) { return specifier === 'three' ? { url: three, shortCircuit: true } : next(specifier, context); } });
const { createClassicState, simulateClassicShot } = await import('../match-server/src/authoritative-classic-match-simulation.js');
const { authoritativeRoomShot } = await import('../match-server/src/authoritative-room-shot-service.js');
const { createRoom, joinRoom, setReady } = await import('../match-server/src/live-match-room-rules.js');
const shot = (seq=0) => ({ requestId:'a'.repeat(32),seq,cap:3,vx:1,vz:0 });

test('all six actual classic venues have server-owned tables and opening rules', () => {
  for(const venue of ['schoolyard','kiosk','veranda','roadside','harmattan','nightbulb']) {
    const state=createClassicState(venue);
    assert.equal(state.seq,0);assert.equal(state.rules.turn,'home');
    assert.deepEqual(state.rules.scores,{home:0,away:0});
    assert.ok(state.table.length>=60);assert.ok(state.table.every(Number.isFinite));
  }
  assert.throws(()=>createClassicState('legend-roadside-act1'),/classic venue/);
});
test('simulation is deterministic, spends a flick, settles bodies, and does not mutate its input', () => {
  const state=createClassicState('veranda'), before=structuredClone(state);
  const a=simulateClassicShot(state,'home',shot()), b=simulateClassicShot(state,'home',shot());
  assert.deepEqual(a,b);assert.deepEqual(state,before);
  assert.equal(a.rules.flicksUsed.home,1);assert.equal(a.rules.turn,'away');assert.equal(a.seq,1);
  assert.ok(a.table.every((value,index)=>index%4<2 || value===0));
});
test('wrong-side, wrong-sequence, opponent-cap and excessive velocity are refused', () => {
  const state=createClassicState('schoolyard');
  for(const [side,change] of [['away',{}],['home',{seq:1}],['home',{cap:5}],['home',{cap:-1}],['home',{vx:99}],['home',{vx:NaN}],['home',{vx:0,vz:0}]]) {
    assert.throws(()=>simulateClassicShot(state,side,{...shot(),...change}));
  }
});
test('real goal crossing changes server score, ends first-to-one, and prevents more shots', () => {
  const state=createClassicState('schoolyard');
  // A trusted server checkpoint near goal, not a client-supplied position.
  state.table[3*4]=1.15;state.table[3*4+1]=0;
  state.table[10*4]=1.3;state.table[10*4+1]=0;
  state.table[5*4]=1.3;state.table[5*4+1]=0.6;
  const result=simulateClassicShot(state,'home',{...shot(),vx:3});
  assert.equal(result.goal,1);assert.equal(result.rules.scores.home,1);
  assert.equal(result.rules.phase,'ended');assert.equal(result.result.winner,'home');
  assert.throws(()=>simulateClassicShot(result,'away',{...shot(1),cap:8}));
});
function fixture() {
  const room=createRoom({levelId:'schoolyard',homeName:'A'});joinRoom(room,{name:'B'});
  setReady(room,'home',true);setReady(room,'away',true);room.simulation='server-v1';
  const values=new Map();
  const ctx={getWebSockets:()=>[],storage:{get:async key=>structuredClone(values.get(key)),
    put:async entries=>{for(const [key,value]of Object.entries(entries))values.set(key,structuredClone(value));},setAlarm:async()=>{}}};
  const post=(body,token=room.seats.home.token)=>authoritativeRoomShot(ctx,new Request('https://match/room/shot',{method:'POST',body:JSON.stringify({token,matchId:room.epoch,...body})}),structuredClone(values.get('room')??room));
  return {room,values,post,ctx};
}
test('server receipts are idempotent; conflicting retries and forged score fields are rejected',async()=>{
  const {post,values}=fixture();
  assert.equal((await post({...shot(),scores:{home:99,away:0}})).status,400);
  assert.equal((await post(shot(),'wrong')).status,403);
  const first=await post(shot());assert.equal(first.status,201);
  const accepted=await first.json();
  assert.deepEqual(await (await post(shot())).json(),accepted);
  assert.equal((await post({...shot(),vx:2})).status,409);
  assert.equal((await post({...shot(),requestId:'b'.repeat(32)})).status,409);
  assert.equal(values.get('room:authoritative-state').seq,1);
});
test('stale or foreign-room commands cannot change state, and snapshots require a seat token',async()=>{
  const {post,room,ctx,values}=fixture();
  assert.equal((await post({...shot(),epoch:'foreign'})).status,400);
  const get=token=>authoritativeRoomShot(ctx,new Request('https://match/room/shot',{headers:{Authorization:`Bearer ${token}`}}),room);
  assert.equal((await get('bad')).status,403);
  const snapshot=await (await get(room.seats.away.token)).json();
  assert.equal(snapshot.state.seq,0);assert.equal(snapshot.matchId,room.epoch);
  assert.equal(values.get('room:authoritative-state').seq,0);
  assert.equal(JSON.stringify(snapshot).includes(room.seats.home.token),false);
});
test('legacy rooms and rooms before kickoff cannot opt in through a shot',async()=>{
  const {ctx,room}=fixture();const request=()=>new Request('https://match/room/shot',{method:'POST',body:JSON.stringify({token:room.seats.home.token,...shot()})});
  delete room.simulation;assert.equal((await authoritativeRoomShot(ctx,request(),room)).status,409);
  room.simulation='server-v1';room.phase='lobby';assert.equal((await authoritativeRoomShot(ctx,request(),room)).status,409);
});
test('a full scoreless match spends regulation and tiebreak budgets and persists one verified result',async()=>{
  const {room,ctx,values,post}=fixture();
  room.seats.home.profileId='c'.repeat(32);
  room.seats.away.profileId='d'.repeat(32);
  let state=createClassicState('schoolyard');
  while(state.rules.phase!=='ended') {
    const side=state.rules.turn;
    const response=await post({requestId:(state.seq+1).toString(16).padStart(32,'0'),seq:state.seq,
      cap:side==='home'?0:5,vx:0.001,vz:0},room.seats[side].token);
    assert.ok(response.ok);state=(await response.json()).state;
    assert.ok(state.seq<=30);
  }
  assert.equal(state.seq,30);assert.equal(state.result.winner,null);
  assert.deepEqual(state.result.flicksUsed,{home:15,away:15});
  const receipt=values.get('room:verified-result');
  assert.equal(receipt.serverVerified,true);assert.equal(receipt.rated,false);
  assert.equal(receipt.matchId,room.epoch);
  assert.equal(receipt.participants.home,room.seats.home.profileId);
  assert.equal(values.get('room').phase,'ended');
  const read=await authoritativeRoomShot(ctx,new Request('https://match/room/shot',{
    headers:{Authorization:`Bearer ${room.seats.away.token}`}}),values.get('room'));
  assert.deepEqual((await read.json()).state,state);
  assert.equal((await post({requestId:'f'.repeat(32),seq:30,cap:0,vx:1,vz:0})).status,409);
});
test('a non-winning goal resets the physical table and gives the conceder kickoff',()=>{
  const state=createClassicState('kiosk');
  state.table[3*4]=1.15;state.table[3*4+1]=0;
  state.table[10*4]=1.3;state.table[10*4+1]=0;
  state.table[5*4]=1.3;state.table[5*4+1]=0.6;
  const result=simulateClassicShot(state,'home',{...shot(),vx:3});
  assert.equal(result.rules.scores.home,1);assert.equal(result.rules.turn,'away');
  assert.equal(result.result,null);assert.deepEqual(result.table,createClassicState('kiosk').table);
});
