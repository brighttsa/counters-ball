import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(specifier,context,next){return specifier==='three'?{url:pathToFileURL(process.env.COUNTERS_TEST_THREE??'/tmp/counters-ball-test-three-r160.mjs').href,shortCircuit:true}:next(specifier,context);}});
const {rankedAbandonment,startRankedTurn,resumeRankedTurn}=await import('../match-server/src/ranked-abandonment-policy.js');
const {tickRankedRoom}=await import('../match-server/src/ranked-room-watchdog.js');
const {createClassicState}=await import('../match-server/src/authoritative-classic-match-simulation.js');
const {leavePublicMatchLobby}=await import('../match-server/src/public-match-lobby-departure.js');
const {reserveRankedResult,settleRankedResult}=await import('../match-server/src/ranked-result-settlement-service.js');
const {releaseRankedReservation}=await import('../match-server/src/ranked-reservation-release.js');
const room=()=>({id:'abcdefgh23',epoch:crypto.randomUUID(),simulation:'server-v1',matchmaking:true,levelId:'schoolyard',phase:'playing',
  ranked:{kind:'ranked',active:true,activatedAt:0,turnDeadline:60000},
  seats:{home:{seenAt:60000,profileId:'a'.repeat(32),token:'home',ready:true},away:{seenAt:60000,profileId:'b'.repeat(32),token:'away',ready:true}}});
test('casual matches and unactivated ranked rooms have no abandonment decisions',()=>{
  const r=room();delete r.ranked;assert.equal(rankedAbandonment(r,null,900000),null);
  r.ranked={kind:'ranked',active:false};assert.equal(rankedAbandonment(r,null,900000),null);
});
test('present players receive a current-turn forfeit at exactly the deadline',()=>{
  const r=room(),state={rules:{turn:'away'}};
  assert.equal(rankedAbandonment(r,state,59999),null);
  assert.deepEqual(rankedAbandonment(r,state,60000),{kind:'forfeit',forfeiter:'away',reason:'turn-timeout'});
});
test('offline players get grace instead of an immediate turn-timeout loss',()=>{
  const r=room();r.seats.home.seenAt=0;
  assert.equal(rankedAbandonment(r,{rules:{turn:'home'}},60000),null);
  r.seats.away.seenAt=90000;
  assert.deepEqual(rankedAbandonment(r,null,90000),{kind:'forfeit',forfeiter:'home',reason:'disconnect-timeout'});
});
test('two absent players cause a void, not a guessed winner',()=>{
  const r=room();r.seats.home.seenAt=0;r.seats.away.seenAt=0;
  assert.equal(rankedAbandonment(r,null,89999),null);
  assert.deepEqual(rankedAbandonment(r,null,90000),{kind:'void',reason:'both-disconnected'});
});
test('reconnect resumes the remaining turn time and never grants unlimited fresh turns',()=>{
  const r=room();r.seats.home.seenAt=0;
  rankedAbandonment(r,null,30000);assert.equal(r.ranked.suspendedAt,15000);
  r.seats.home.seenAt=45000;r.seats.away.seenAt=45000;resumeRankedTurn(r,45000);
  assert.equal(r.ranked.turnDeadline,90000);resumeRankedTurn(r,50000);assert.equal(r.ranked.turnDeadline,90000);
  startRankedTurn(r,90000,2500);assert.equal(r.ranked.turnDeadline,152500);
});
test('lobby expiry cancels after activation, not installation or a client clock',()=>{
  const r=room();r.phase='lobby';r.ranked.activatedAt=10000;
  assert.equal(rankedAbandonment(r,null,99999),null);
  assert.equal(rankedAbandonment(r,null,100000).reason,'lobby-timeout');
});
function fixture(r=room()){
  const data=new Map([['room',r],['room:authoritative-state',createClassicState('schoolyard')]]);let alarm;
  const ctx={getWebSockets:()=>[],storage:{get:async k=>structuredClone(data.get(k)),
    put:async entries=>{for(const [k,v]of Object.entries(entries))data.set(k,structuredClone(v));},setAlarm:async n=>{alarm=n;}}};
  return {data,ctx,alarm:()=>alarm};
}
test('watchdog commits one canonical forfeit and rating-delivery job atomically',async()=>{
  const f=fixture();assert.equal(await tickRankedRoom(f.ctx,60000),true);
  const state=f.data.get('room:authoritative-state'),receipt=f.data.get('room:verified-result');
  assert.equal(state.seq,1);assert.equal(state.rules.phase,'ended');assert.equal(state.lastShot,null);
  assert.equal(receipt.result.winner,'away');assert.equal(receipt.result.forfeiter,'home');
  assert.equal(receipt.finishedAt,60000);assert.equal(receipt.serverVerified,true);
  assert.equal(f.data.get('room:ranked-outbox').matchId,receipt.matchId);assert.equal(f.alarm(),61000);
  await tickRankedRoom(f.ctx,70000);assert.equal(f.data.get('room:authoritative-state').seq,1);
});
test('void commits a reservation release job without fabricating a score receipt',async()=>{
  const r=room();r.seats.home.seenAt=0;r.seats.away.seenAt=0;const f=fixture(r);
  await tickRankedRoom(f.ctx,90000);
  assert.equal(f.data.get('room').phase,'cancelled');assert.equal(f.data.get('room:verified-result'),undefined);
  assert.equal(f.data.get('room:ranked-outbox').action,'void');
});
test('ranked lobby departure persists release once and repeats do not reset retries',async()=>{
  const r=room();r.phase='lobby';const f=fixture(r);
  const request=()=>new Request('https://match/room/leave',{method:'POST',body:JSON.stringify({token:'home'})});
  assert.equal((await leavePublicMatchLobby(f.ctx,request())).status,200);
  const job=f.data.get('room:ranked-outbox');job.attempts=3;f.data.set('room:ranked-outbox',job);
  assert.equal((await leavePublicMatchLobby(f.ctx,request())).status,200);
  assert.equal(f.data.get('room:ranked-outbox').attempts,3);
});
test('canonical timeout receipts settle tied scores as a forfeit exactly once',async()=>{
  const r=room();r.phase='ready';r.ranked.startedAt=0;const f=fixture(r);
  await reserveRankedResult(f.ctx,{roomId:r.id,room:r},{anchor:0,now:0});
  await tickRankedRoom(f.ctx,60000);
  const source={roomId:r.id,receipt:f.data.get('room:verified-result')};
  const result=await settleRankedResult(f.ctx,source,{now:60000});
  assert.equal(result.delta.away,12);assert.equal(result.delta.home,-12);
  assert.deepEqual(await settleRankedResult(f.ctx,source,{now:60001}),result);
  assert.equal(f.data.get(`ranked:rating:0:${r.seats.away.profileId}`).matches,1);
});
test('canonical two-player abandonment releases both profile locks without a rating change',async()=>{
  const r=room();r.phase='ready';r.ranked.startedAt=0;r.seats.home.seenAt=0;r.seats.away.seenAt=0;
  const f=fixture(r);await reserveRankedResult(f.ctx,{roomId:r.id,room:r},{anchor:0,now:0});
  await tickRankedRoom(f.ctx,90000);
  const source={roomId:r.id,room:f.data.get('room')};
  const result=await releaseRankedReservation(f.ctx,source);
  assert.equal(result.status,'void');assert.deepEqual(await releaseRankedReservation(f.ctx,source),result);
  assert.equal(f.data.get(`ranked:active:${r.seats.home.profileId}`),null);
  assert.equal(f.data.get(`ranked:active:${r.seats.away.profileId}`),null);
  assert.equal(f.data.get(`ranked:rating:0:${r.seats.home.profileId}`),undefined);
});
test('a failed alarm write is repaired on the next access without creating another result',async()=>{
  const f=fixture(),setAlarm=f.ctx.storage.setAlarm;let fail=true;
  f.ctx.storage.setAlarm=async time=>{if(fail){fail=false;throw Error('alarm unavailable');}return setAlarm(time);};
  await assert.rejects(tickRankedRoom(f.ctx,60000),/alarm unavailable/);
  assert.equal(f.data.get('room:authoritative-state').seq,1);
  await tickRankedRoom(f.ctx,60001);
  assert.equal(f.alarm(),61000);assert.equal(f.data.get('room:authoritative-state').seq,1);
});
