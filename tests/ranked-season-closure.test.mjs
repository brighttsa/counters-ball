import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {rankedLedgerContext} from '../match-server/src/ranked-ledger-sql-storage.js';
import {reserveRankedResult} from '../match-server/src/ranked-result-settlement-service.js';
import {closeExpiredRankedReservations,closeRankedRoom} from '../match-server/src/ranked-season-closure.js';
import {SEASON_MS,GRACE_MS} from '../match-server/src/ranked-rating-rules.js';
const anchor=Date.parse('2026-09-28T00:00:00Z'),cutoff=anchor+SEASON_MS+GRACE_MS;
function fixture(){
  const db=new DatabaseSync(':memory:'),values=new Map();let alarm;
  const ctx={getWebSockets:()=>[],storage:{get:async key=>structuredClone(values.get(key)),put:async entries=>{for(const [k,v]of Object.entries(entries))values.set(k,structuredClone(v));},
    setAlarm:async t=>{alarm=t;},sql:{exec(q,...p){const s=db.prepare(q);return s.columns().length?s.all(...p):(s.run(...p),[]);}},
    transactionSync(fn){db.exec('BEGIN');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}}};
  const room={id:'abcdefgh23',epoch:crypto.randomUUID(),phase:'lobby',levelId:'schoolyard',simulation:'server-v1',matchmaking:true,
    ranked:{kind:'ranked',startedAt:anchor},seats:{home:{profileId:'a'.repeat(32)},away:{profileId:'b'.repeat(32)}}};
  const ledger=rankedLedgerContext(ctx),source={roomId:room.id,room};
  const env={RANKED_SETTLEMENT_ENABLED:'true',RANKED_SEASON_ANCHOR:'2026-09-28T00:00:00Z',KONK_MATCH:{idFromName:n=>n,get:()=>({fetch:async()=>Response.json({room:{...room,phase:'cancelled',cancelReason:'season-cutoff'}})})}};
  return {db,ctx,values,ledger,room,source,env,alarm:()=>alarm};
}
test('reserved-but-unactivated room is voided and releases both profiles at season closure',async()=>{
  const f=fixture();try{
    await reserveRankedResult(f.ledger,f.source,{anchor,now:anchor});
    await closeExpiredRankedReservations(f.ctx,f.env,cutoff+1);
    const result=await f.ledger.storage.get(`ranked:reservation:${f.room.epoch}`);
    assert.equal(result.status,'void');assert.equal(await f.ledger.storage.get('ranked:pending:0'),0);
    assert.equal(await f.ledger.storage.get(`ranked:active:${'a'.repeat(32)}`),null);
    assert.equal(await f.ledger.storage.get(`ranked:rating:0:${'a'.repeat(32)}`),undefined);
    await closeExpiredRankedReservations(f.ctx,f.env,cutoff+2);
    assert.equal(await f.ledger.storage.get('ranked:pending:0'),0);
  }finally{f.db.close();}
});
test('canonical finished receipt within grace settles instead of being voided',async()=>{
  const f=fixture();try{
    await reserveRankedResult(f.ledger,f.source,{anchor,now:anchor});
    f.env.KONK_MATCH.get=()=>({fetch:async()=>Response.json({room:f.room,receipt:{matchId:f.room.epoch,version:'server-v1',levelId:'schoolyard',seq:1,serverVerified:true,
      finishedAt:cutoff,participants:{home:'a'.repeat(32),away:'b'.repeat(32)},result:{winner:'home',scores:{home:1,away:0}}}})});
    await closeExpiredRankedReservations(f.ctx,f.env,cutoff+1);
    assert.equal((await f.ledger.storage.get(`ranked:reservation:${f.room.epoch}`)).status,'settled');
    assert.equal((await f.ledger.storage.get(`ranked:rating:0:${'a'.repeat(32)}`)).rating,1012);
  }finally{f.db.close();}
});
test('unreachable or foreign canonical rooms retain pending reservations and schedule retry',async()=>{
  for(const reply of [()=>{throw Error('offline');},()=>Response.json({room:{epoch:crypto.randomUUID()}})]){
    const f=fixture();try{
      await reserveRankedResult(f.ledger,f.source,{anchor,now:anchor});f.env.KONK_MATCH.get=()=>({fetch:async()=>reply()});
      await closeExpiredRankedReservations(f.ctx,f.env,cutoff+1);
      assert.equal((await f.ledger.storage.get(`ranked:reservation:${f.room.epoch}`)).status,'reserved');
      assert.equal(f.alarm(),cutoff+60001);
    }finally{f.db.close();}
  }
});
test('room cutoff rejects premature closure, then persists cancellation and release job',async()=>{
  const f=fixture();try{
    f.values.set('room',f.room);
    const request=()=>new Request('https://match/internal/ranked/close',{method:'POST',body:JSON.stringify({matchId:f.room.epoch})});
    assert.equal((await closeRankedRoom(f.ctx,f.env,request(),cutoff)).status,409);
    assert.equal((await closeRankedRoom(f.ctx,f.env,request(),cutoff+1)).status,200);
    assert.equal(f.values.get('room').phase,'cancelled');assert.equal(f.values.get('room:ranked-outbox').action,'void');
    const replay=await reserveRankedResult(f.ledger,f.source,{anchor,now:anchor});
    assert.equal(replay.status,'reserved');
    f.source.room=f.values.get('room');
    assert.equal((await reserveRankedResult(f.ledger,f.source,{anchor,now:cutoff+2})).status,'reserved');
  }finally{f.db.close();}
});
