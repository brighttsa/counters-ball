import test from 'node:test';
import assert from 'node:assert/strict';
import {deliverRankedResult,rankedResultJob,RANKED_OUTBOX} from '../match-server/src/ranked-result-outbox.js';
const room={id:'abcdefgh23',epoch:'a'.repeat(36),ranked:{kind:'ranked'}};
function fixture(){
  const values=new Map([[RANKED_OUTBOX,rankedResultJob(room,0)],['room:verified-result',{matchId:room.epoch,rated:false}]]);
  let locked=false,alarm,calls=0,result={registration:{matchId:room.epoch,roomId:room.id},status:'settled',delta:{home:12,away:-12}};
  const ctx={blockConcurrencyWhile:async fn=>{assert.equal(locked,false);locked=true;try{return await fn();}finally{locked=false;}},
    storage:{get:async k=>structuredClone(values.get(k)),put:async entries=>{for(const [k,v]of Object.entries(entries))values.set(k,structuredClone(v));},setAlarm:async t=>{alarm=t;}}};
  const env={KONK_MATCH:{idFromName:n=>n,get:()=>({fetch:async()=>{assert.equal(locked,false);calls++;if(result instanceof Error)throw result;return Response.json(result);}})}};
  return {ctx,env,values,setResult:v=>{result=v;},calls:()=>calls,alarm:()=>alarm};
}
test('casual matches produce no job; ranked jobs need a canonical room identity',()=>{
  assert.equal(rankedResultJob({}),null);assert.throws(()=>rankedResultJob({ranked:{kind:'ranked'}}),/identity missing/);
});
test('delivery reads coordinator outside the room lock and stores the rating acknowledgement',async()=>{
  const f=fixture();await deliverRankedResult(f.ctx,f.env,1000);
  assert.equal(f.values.get(RANKED_OUTBOX),null);assert.equal(f.values.get('room:verified-result').rated,true);
  assert.deepEqual(f.values.get('room:verified-result').ratingDelta,{home:12,away:-12});
  assert.equal(await deliverRankedResult(f.ctx,f.env,2000),false);assert.equal(f.calls(),1);
});
test('network failure persists a bounded retry; early alarms never redeliver',async()=>{
  const f=fixture();f.setResult(Error('offline'));await deliverRankedResult(f.ctx,f.env,1000);
  assert.equal(f.values.get(RANKED_OUTBOX).attempts,1);assert.equal(f.alarm(),3000);
  await deliverRankedResult(f.ctx,f.env,2000);assert.equal(f.calls(),1);
  f.setResult({registration:{matchId:room.epoch,roomId:room.id},status:'settled'});
  await deliverRankedResult(f.ctx,f.env,3000);assert.equal(f.values.get(RANKED_OUTBOX),null);
});
test('foreign acknowledgements cannot mark the receipt as rated',async()=>{
  const f=fixture();f.setResult({registration:{matchId:'wrong',roomId:room.id},status:'settled'});
  await deliverRankedResult(f.ctx,f.env,1000);assert.equal(f.values.get('room:verified-result').rated,false);
  assert.equal(f.values.get(RANKED_OUTBOX).attempts,1);
});
test('a failed local acknowledgement safely redelivers the same match after restart',async()=>{
  const f=fixture(),put=f.ctx.storage.put;
  let fail=true;
  f.ctx.storage.put=async entries=>{if(fail&&entries[RANKED_OUTBOX]===null){fail=false;throw Error('storage unavailable');}return put(entries);};
  await assert.rejects(deliverRankedResult(f.ctx,f.env,1000),/storage unavailable/);
  assert.ok(f.values.get(RANKED_OUTBOX));assert.equal(f.values.get('room:verified-result').rated,false);
  await deliverRankedResult(f.ctx,f.env,2000);
  assert.equal(f.calls(),2);assert.equal(f.values.get(RANKED_OUTBOX),null);
  assert.deepEqual(f.values.get('room:verified-result').ratingDelta,{home:12,away:-12});
});
test('a stale delivery cannot overwrite a newer epoch job or result',async()=>{
  const f=fixture(),stub=f.env.KONK_MATCH.get;
  f.env.KONK_MATCH.get=()=>({fetch:async(...args)=>{
    const response=await stub().fetch(...args);
    f.values.set(RANKED_OUTBOX,{...rankedResultJob(room,0),matchId:'b'.repeat(36)});
    f.values.set('room:verified-result',{matchId:'b'.repeat(36),rated:false});
    return response;
  }});
  await deliverRankedResult(f.ctx,f.env,1000);
  assert.equal(f.values.get(RANKED_OUTBOX).matchId,'b'.repeat(36));
  assert.equal(f.values.get('room:verified-result').rated,false);
});
