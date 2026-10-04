import test from 'node:test';
import assert from 'node:assert/strict';
import { reserveRankedResult,settleRankedResult } from '../match-server/src/ranked-result-settlement-service.js';
import { settleRatings,freshRating,isPlaced,SEASON_MS,GRACE_MS } from '../match-server/src/ranked-rating-rules.js';
import { handleRankedCoordinator } from '../match-server/src/ranked-internal-coordinator.js';
const anchor=Date.parse('2026-09-28T00:00:00Z'),now=anchor+10000;
const ids={home:'a'.repeat(32),away:'b'.repeat(32)};
function fixture(){
  const store=new Map();let fail=false;
  const ctx={storage:{get:async k=>structuredClone(store.get(k)),put:async values=>{
    if(fail)throw Error('storage unavailable');for(const [k,v]of Object.entries(values))store.set(k,structuredClone(v));}}};
  const source={roomId:'abcdefghij',room:{epoch:crypto.randomUUID(),phase:'ready',levelId:'schoolyard',simulation:'server-v1',
    matchmaking:true,ranked:{kind:'ranked',startedAt:now},seats:Object.fromEntries(Object.entries(ids).map(([side,profileId])=>[side,{profileId}]))}};
  const receipt=()=>({matchId:source.room.epoch,version:'server-v1',levelId:'schoolyard',seq:1,serverVerified:true,
    participants:ids,finishedAt:now+1000,result:{winner:'home',scores:{home:1,away:0}}});
  const reserve=()=>reserveRankedResult(ctx,source,{anchor,now});
  const settle=extra=>settleRankedResult(ctx,{roomId:source.roomId,receipt:{...receipt(),...extra}},{now:now+2000});
  return {ctx,store,source,reserve,settle,receipt,setFail:v=>{fail=v;}};
}
test('equal ratings exchange 12 points; draws and opponent strength drive Elo, not score margin',()=>{
  const result=settleRatings(freshRating(),freshRating(),'home',ids.home,ids.away);
  assert.equal(result.home.rating,1012);assert.equal(result.away.rating,988);
  assert.equal(settleRatings(freshRating(),freshRating(),null,ids.home,ids.away).delta,0);
  assert.ok(settleRatings({...freshRating(),rating:1200},freshRating(),'home',ids.home,ids.away).delta<12);
});
test('one atomic write settles both players; duplicates survive a coordinator restart',async()=>{
  const f=fixture();await f.reserve();const first=await f.settle();
  assert.equal(first.status,'settled');assert.equal(f.store.get(`ranked:rating:0:${ids.home}`).rating,1012);
  assert.deepEqual(f.store.get(`ranked:rating:0:${ids.home}`).lastResult,{matchId:f.source.room.epoch,delta:12,rating:1012,finishedAt:now+1000});
  assert.equal(f.store.get(`ranked:rating:0:${ids.away}`).lastResult.delta,-12);
  assert.equal(f.store.get(`ranked:rating:0:${ids.away}`).matches,1);
  assert.deepEqual(await f.settle(),first);
  assert.deepEqual(await settleRankedResult({storage:f.ctx.storage},{roomId:f.source.roomId,receipt:f.receipt()},{now:now+2000}),first);
  assert.equal(f.store.get(`ranked:rating:0:${ids.home}`).matches,1);
});
test('failed commit changes neither rating; retry consumes the receipt once',async()=>{
  const f=fixture();await f.reserve();f.setFail(true);await assert.rejects(f.settle,/storage/);
  assert.equal(f.store.get(`ranked:rating:0:${ids.home}`),undefined);
  f.setFail(false);assert.equal((await f.settle()).status,'settled');
});
test('casual rooms, guests, self-matches and concurrent profile reservations are rejected',async()=>{
  for(const mutate of [s=>{s.room.matchmaking=false;},s=>{delete s.room.ranked;},s=>{s.room.seats.away.profileId=ids.home;},s=>{delete s.room.seats.away.profileId;}]){
    const f=fixture();mutate(f.source);await assert.rejects(f.reserve);
  }
  const f=fixture();await f.reserve();f.source.room.epoch=crypto.randomUUID();await assert.rejects(f.reserve,/active ranked/);
});
test('daily opponent eligibility is reserved before play; third encounter remains unranked',async()=>{
  const f=fixture();
  for(let i=0;i<2;i++){await f.reserve();await f.settle();f.source.room.epoch=crypto.randomUUID();}
  const third=await f.reserve();assert.equal(third.status,'unranked');assert.equal(third.reason,'daily-opponent-limit');
  await f.settle();assert.equal(f.store.get(`ranked:rating:0:${ids.home}`).matches,2);
});
test('foreign or conflicting receipts never update standings',async()=>{
  const f=fixture();await f.reserve();
  for(const extra of [{serverVerified:false},{participants:{...ids,away:'c'.repeat(32)}},{result:{winner:'home',scores:{home:0,away:1}}}])
    await assert.rejects(()=>f.settle(extra));
  await f.settle();await assert.rejects(()=>f.settle({result:{winner:'away',scores:{home:0,away:1}}}),/Conflicting/);
});
test('season grace pins old standings, expired completion voids and releases active seats',async()=>{
  for(const extra of [0,1]){
    const f=fixture();await f.reserve();const finishedAt=anchor+SEASON_MS+GRACE_MS+extra;
    const result=await settleRankedResult(f.ctx,{roomId:f.source.roomId,receipt:{...f.receipt(),finishedAt}},{now:finishedAt+1});
    assert.equal(result.status,extra?'void':'settled');assert.equal(f.store.get(`ranked:active:${ids.home}`),null);
  }
});
test('placement needs five results and three opponents; next season soft-resets prior rating',async()=>{
  assert.equal(isPlaced({...freshRating(),matches:5,opponents:['a','b']}),false);
  assert.equal(isPlaced({...freshRating(),matches:5,opponents:['a','b','c']}),true);
  assert.equal(freshRating({rating:1200}).rating,1100);
});
test('new-season initialization waits for reserved previous-season results',async()=>{
  const f=fixture();await f.reserve();await f.settle();
  f.store.set('ranked:pending:0',1);
  f.source.room.epoch=crypto.randomUUID();f.source.room.ranked.startedAt=anchor+SEASON_MS+1000;
  await reserveRankedResult(f.ctx,f.source,{anchor,now:anchor+SEASON_MS+1000});
  const source={roomId:f.source.roomId,receipt:{...f.receipt(),finishedAt:anchor+SEASON_MS+2000}};
  await assert.rejects(()=>settleRankedResult(f.ctx,source,{now:anchor+SEASON_MS+3000}),/still settling/);
  f.store.set('ranked:pending:0',0);
  await settleRankedResult(f.ctx,source,{now:anchor+SEASON_MS+3000});
  assert.ok(f.store.get(`ranked:rating:1:${ids.home}`).rating>1006);
});
test('internal coordinator is disabled by default and resolves results from the match object',async()=>{
  const f=fixture();await f.reserve();
  const request=()=>new Request('https://match/internal/ranked/settle',{method:'POST',body:JSON.stringify({
    roomId:f.source.roomId,matchId:f.source.room.epoch,receipt:{winner:'away'}})});
  assert.equal((await handleRankedCoordinator(f.ctx,{},request())).status,409);
  const env={RANKED_SETTLEMENT_ENABLED:'true',KONK_MATCH:{idFromName:id=>id,get:id=>({fetch:async()=>{
    assert.equal(id,f.source.roomId);return Response.json({receipt:f.receipt()});}})}};
  const response=await handleRankedCoordinator(f.ctx,env,request());assert.equal(response.status,200);
  assert.equal((await response.json()).delta.home,12);
});
