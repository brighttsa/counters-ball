import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers/real-three-session-fixture.mjs';
const {authoritativeRoomRematch}=await import('../match-server/src/authoritative-room-rematch-service.js');
const {createRoom,joinRoom}=await import('../match-server/src/live-match-room-rules.js');
function setup(){
  const room=createRoom({levelId:'schoolyard',homeName:'Home'});joinRoom(room,{name:'Away'});
  room.phase='ended';room.simulation='server-v1';
  const epoch=room.epoch,result={matchId:epoch,result:{winner:'home'}};
  const store=new Map([['room',structuredClone(room)],['room:verified-result',result]]);
  const ctx={getWebSockets:()=>[],storage:{get:async key=>structuredClone(store.get(key)),
    put:async entries=>{for(const [k,v]of Object.entries(entries))store.set(k,structuredClone(v));}}};
  const request=(side,matchId=epoch)=>authoritativeRoomRematch(ctx,new Request('https://match/room/rematch',{
    method:'POST',body:JSON.stringify({token:room.seats[side]?.token??'wrong',matchId})}));
  return {request,store,epoch,result};
}
test('one rematch request waits; two acceptances create one shared clean match',async()=>{
  const f=setup();const first=await (await f.request('home')).json();
  assert.equal(first.room.phase,'lobby');assert.equal(first.room.seats.home.ready,true);
  assert.equal(first.room.seats.away.ready,false);assert.notEqual(first.room.matchId,f.epoch);
  const second=await (await f.request('away')).json();
  assert.equal(second.room.phase,'ready');assert.equal(second.room.matchId,first.room.matchId);
  const state=f.store.get('room:authoritative-state');assert.equal(state.seq,0);
  assert.deepEqual(state.rules.scores,{home:0,away:0});assert.equal(state.rules.turn,'home');
  assert.deepEqual(f.store.get(`room:verified-result:${f.epoch}`),f.result);
  assert.equal(f.store.get('room:verified-result'),null);
  assert.equal((await (await f.request('home')).json()).room.matchId,first.room.matchId);
});
test('foreign seats and stale epochs cannot restart an active match',async()=>{
  const f=setup();assert.equal((await f.request('unknown')).status,403);
  assert.equal((await f.request('home','foreign')).status,409);
  await f.request('home');const room=f.store.get('room');room.phase='playing';f.store.set('room',room);
  assert.equal((await f.request('away','foreign')).status,409);
  assert.equal(f.store.get('room').epoch,room.epoch);
});
