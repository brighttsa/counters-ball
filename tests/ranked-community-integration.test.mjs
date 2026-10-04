import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { rankedLedgerContext } from '../match-server/src/ranked-ledger-sql-storage.js';
import { rankedStanding } from '../match-server/src/ranked-standings-service.js';
import {routeRankedStandings} from '../match-server/src/ranked-standings-routes.js';
import {handleRankedMatchmaking,recoverRankedSearches} from '../match-server/src/ranked-matchmaking-service.js';
import {routeRankedMatchmaking} from '../match-server/src/ranked-matchmaking-routes.js';
import {installRankedRoom} from '../match-server/src/ranked-room-installation.js';
import {rankedSearchStorage} from '../match-server/src/ranked-search-storage.js';

const id=n=>n.toString(16).padStart(32,'0');
function fixture(){
  const db=new DatabaseSync(':memory:');
  const values=new Map();
  const ctx={storage:{get:async k=>values.get(k),put:async(k,v)=>{
    if(typeof k==='string')values.set(k,v);else for(const [key,value]of Object.entries(k))values.set(key,value);
  },setAlarm:async()=>{},sql:{exec(query,...params){const s=db.prepare(query);return s.columns().length?s.all(...params):(s.run(...params),[]);}},
    transactionSync(fn){db.exec('BEGIN');try{const value=fn();db.exec('COMMIT');return value;}catch(error){db.exec('ROLLBACK');throw error;}}}};
  return {db,raw:ctx,ctx:rankedLedgerContext(ctx),env:{RANKED_SEASON_ANCHOR:'2026-09-28T00:00:00Z'}};
}
const now=Date.parse('2026-10-02T00:00:00Z');
async function add(f,n,rating,placed=true){
  await f.ctx.storage.put({[`ranked:name:${id(n)}`]:`KONKER ${n}`});
  await f.ctx.storage.put({[`ranked:rating:0:${id(n)}`]:{rating,matches:5,wins:3,draws:1,losses:1,placed,opponents:[id(7),id(8),id(9)]}});
}
test('indexed standings paginate exact ratings with stable competition ties',async()=>{
  const f=fixture();try{
    await add(f,1,1200);await add(f,2,1200);await add(f,3,1100);await add(f,4,1500,false);
    const first=await rankedStanding(f.ctx,f.env,{limit:1},now);
    assert.equal(first.placedPlayers,3);assert.equal(first.rows[0].name,'KONKER 1');assert.equal(first.rows[0].rank,1);
    const second=await rankedStanding(f.ctx,f.env,{limit:1,cursor:first.nextCursor},now);
    assert.equal(second.rows[0].id,id(2));assert.equal(second.rows[0].rank,1);
    const third=await rankedStanding(f.ctx,f.env,{cursor:second.nextCursor},now);
    assert.equal(third.rows[0].rank,3);assert.equal(third.nextCursor,null);
  }finally{f.db.close();}
});
test('own provisional standing reports qualification without publishing a rank',async()=>{
  const f=fixture();try{
    await add(f,1,1020,false);await f.ctx.storage.put({[`ranked:active:${id(1)}`]:{roomId:'abcdefgh23'}});
    const result=await rankedStanding(f.ctx,f.env,{profileId:id(1)},now);
    assert.equal(result.own.rank,null);assert.equal(result.own.distinctOpponents,3);assert.equal(result.own.activeMatch,'abcdefgh23');assert.deepEqual(result.rows,[]);
  }finally{f.db.close();}
});
test('last rating movement is personal-only',async()=>{
  const f=fixture();try{
    await add(f,1,1012);
    const key=`ranked:rating:0:${id(1)}`;
    await f.ctx.storage.put({[key]:{...await f.ctx.storage.get(key),lastResult:{matchId:'match-1',delta:12,rating:1012,finishedAt:now}}});
    const personal=await rankedStanding(f.ctx,f.env,{profileId:id(1)},now);
    const publicBoard=await rankedStanding(f.ctx,f.env,{},now);
    assert.equal(personal.own.lastResult.delta,12);
    assert.equal(publicBoard.own,null);
    assert.equal('lastResult' in publicBoard.rows[0],false);
  }finally{f.db.close();}
});
test('malformed cursor and future seasons are rejected; fractional limits stay integral',async()=>{
  const f=fixture();try{
    await add(f,1,1200);await add(f,2,1100);
    await assert.rejects(rankedStanding(f.ctx,f.env,{cursor:'broken'},now),/Invalid standings cursor/);
    await assert.rejects(rankedStanding(f.ctx,f.env,{seasonId:'999'},now),/Unknown season/);
    assert.equal((await rankedStanding(f.ctx,f.env,{limit:1.9},now)).rows.length,1);
  }finally{f.db.close();}
});
test('failed batch rolls back both ledger writes and standings index',async()=>{
  const f=fixture();try{
    await add(f,1,1200);
    await assert.rejects(f.ctx.storage.put({receipt:{settled:true},[`ranked:rating:0:${id(1)}`]:null}));
    assert.equal(await f.ctx.storage.get('receipt'),undefined);
    assert.equal((await rankedStanding(f.ctx,f.env,{},now)).rows[0].rating,1200);
  }finally{f.db.close();}
});
test('standings HTTP remains disabled by default and personal reads require credentials',async()=>{
  const request=path=>new Request(`https://match${path}`);
  assert.equal((await routeRankedStandings(request('/standings'),{})).status,409);
  const env={RANKED_SETTLEMENT_ENABLED:'true'};
  assert.equal((await routeRankedStandings(request('/standings/me'),env)).status,401);
  assert.equal((await routeRankedStandings(new Request('https://match/standings',{method:'POST'}),env)).status,405);
  assert.equal(await routeRankedStandings(request('/rooms'),env),null);
});
test('personal HTTP standings authenticate the profile without forwarding its secret',async()=>{
  let forwarded;
  const env={RANKED_SETTLEMENT_ENABLED:'true',KONK_MATCH:{idFromName:n=>n,get:n=>({fetch:async(url,init)=>{
    if(n==='profile-request-limits-v1'||n.startsWith('ranked-limit:'))return Response.json({ok:true});
    if(n===`player:${id(1)}`){assert.equal(init.headers.Authorization,`Bearer ${'a'.repeat(64)}`);return Response.json({profile:{id:id(1)}});}
    assert.equal(n,'ranked-standings-v1');forwarded=JSON.parse(init.body);return Response.json({rows:[],own:{placed:false}});
  }})}};
  const response=await routeRankedStandings(new Request(`https://match/standings/me?profileId=${id(1)}`,{
    headers:{Authorization:`Bearer ${'a'.repeat(64)}`}}),env);
  assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.equal(forwarded.profileId,id(1));assert.equal(JSON.stringify(forwarded).includes('a'.repeat(64)),false);
});
test('public HTTP standings do not accept an own-profile identity from the URL',async()=>{
  let forwarded;
  const env={RANKED_SETTLEMENT_ENABLED:'true',KONK_MATCH:{idFromName:n=>n,get:n=>({fetch:async(url,init)=>{
    if(n==='profile-request-limits-v1'||n.startsWith('ranked-limit:'))return Response.json({ok:true});
    forwarded=JSON.parse(init.body);return Response.json({rows:[]});
  }})}};
  assert.equal((await routeRankedStandings(new Request(`https://match/standings?profileId=${id(1)}`),env)).status,200);
  assert.equal(forwarded.profileId,undefined);
});
function queueFixture(){
  const f=fixture(),rooms=new Map();let fail=false,reserved=0,eligible=true;
  const env={RANKED_SETTLEMENT_ENABLED:'true',KONK_MATCH:{idFromName:n=>n,get:n=>({fetch:async(url,init)=>{
    const body=JSON.parse(init.body);
    if(url.endsWith('/activate'))return Response.json({ok:true});
    if(url.endsWith('/standing'))return Response.json({own:{rating:1000}});
    if(url.endsWith('/reserve')){
      if(fail)return Response.json({error:'temporary failure'},{status:503});
      reserved++;return Response.json({status:eligible?'reserved':'unranked',reason:eligible?null:'daily-opponent-limit',registration:{roomId:body.roomId,matchId:body.matchId}});
    }
    rooms.set(n,body.room);return Response.json({ok:true});
  }})}};
  const call=async(n,action='join',time=now,profile=n)=>{
    const response=await handleRankedMatchmaking(f.raw,env,{ticket:n.toString(16).padStart(36,'0'),verifiedProfileId:id(profile),verifiedName:`KONKER ${profile}`,action},time);
    return {status:response.status,...await response.json()};
  };
  return {...f,env,rooms,call,fail:v=>{fail=v;},eligible:v=>{eligible=v;},reserved:()=>reserved};
}
test('ranked pairs distinct saved profiles on one server-owned table with separate seat tokens',async()=>{
  const f=queueFixture();try{
    assert.equal((await f.call(1)).state,'waiting');
    const away=await f.call(2),home=await f.call(1,'poll');
    assert.equal(away.state,'matched');assert.equal(home.id,away.id);assert.notEqual(home.token,away.token);
    const room=f.rooms.get(home.id);assert.equal(room.simulation,'server-v1');assert.equal(room.seats.home.profileId,id(1));
    assert.equal(room.seats.away.profileId,id(2));assert.equal(f.reserved(),1);
    assert.equal((await f.call(1,'poll',now,3)).status,403);
  }finally{f.db.close();}
});
test('pending pairing survives failed reservation and recovers the same room after retry',async()=>{
  const f=queueFixture();try{
    await f.call(1);f.fail(true);assert.equal((await f.call(2)).status,503);
    const original=[...f.rooms.keys()][0];f.fail(false);
    const result=await f.call(2,'poll');assert.equal(result.id,original);assert.equal(f.rooms.size,1);
    assert.equal((await f.call(1,'poll')).id,original);
  }finally{f.db.close();}
});
test('same-profile searches cannot self-match and cancellation prevents a delayed join',async()=>{
  const f=queueFixture();try{
    await f.call(1);assert.equal((await f.call(2,'join',now,1)).status,409);assert.equal(f.rooms.size,0);
    assert.equal((await f.call(1,'cancel')).state,'cancelled');assert.equal((await f.call(1)).state,'cancelled');
  }finally{f.db.close();}
});
test('ranked skill window widens for both players without a fixed population cap',()=>{
  const f=fixture();try{
    const store=rankedSearchStorage(f.raw);
    const entry={ticket:'a'.repeat(36),profile:id(1),state:'waiting',rating:1000,joined:now,expires:now+200000};
    store.put([entry,{...entry,ticket:'b'.repeat(36),profile:id(2),rating:1400}]);
    assert.equal(store.rival(entry,now),undefined);
    assert.equal(store.rival(entry,now+45000).profile,id(2));
  }finally{f.db.close();}
});
test('queue alarms recover pending pairing without needing either browser to poll',async()=>{
  const f=queueFixture();try{
    await f.call(1);f.fail(true);await f.call(2);f.fail(false);
    await recoverRankedSearches(f.raw,f.env,now+60000);
    assert.equal((await f.call(2,'poll',now+60001)).state,'matched');assert.equal(f.reserved(),1);
  }finally{f.db.close();}
});
test('ranked installer retries preserve the room and reject a competing epoch',async()=>{
  const f=fixture();try{
    const room={phase:'lobby',epoch:crypto.randomUUID(),simulation:'server-v1',ranked:{kind:'ranked'}};
    const request=value=>new Request('https://match/internal/ranked/install',{method:'POST',body:JSON.stringify({room:value})});
    const env={RANKED_SETTLEMENT_ENABLED:'true'};
    assert.equal((await installRankedRoom(f.raw,env,request(room))).status,201);
    assert.equal((await installRankedRoom(f.raw,env,request(room))).status,200);
    assert.equal((await installRankedRoom(f.raw,env,request({...room,epoch:crypto.randomUUID()}))).status,409);
  }finally{f.db.close();}
});
test('ranked HTTP search requires a saved profile and stays disabled by default',async()=>{
  const request=()=>new Request('https://match/ranked/search',{method:'POST',headers:{Origin:'https://konk.world'},body:'{}'});
  assert.equal((await routeRankedMatchmaking(request(),{})).status,409);
  assert.equal((await routeRankedMatchmaking(request(),{RANKED_SETTLEMENT_ENABLED:'true',ALLOWED_ORIGINS:'https://konk.world'})).status,401);
});
test('ineligible pairings never leak seat tokens or silently downgrade ranked play',async()=>{
  const f=queueFixture();try{
    await f.call(1);f.eligible(false);
    const blocked=await f.call(2);assert.equal(blocked.status,409);assert.equal(blocked.state,'blocked');assert.equal(blocked.token,undefined);
    assert.equal((await f.call(1,'poll')).state,'blocked');assert.equal(f.reserved(),1);
  }finally{f.db.close();}
});
test('ranked HTTP ignores forged names and identities, and never forwards profile credentials',async()=>{
  let forwarded;
  const env={RANKED_SETTLEMENT_ENABLED:'true',ALLOWED_ORIGINS:'https://konk.world',KONK_MATCH:{idFromName:n=>n,get:n=>({fetch:async(url,init)=>{
    if(n==='profile-request-limits-v1'||n.startsWith('ranked-limit:'))return Response.json({ok:true});
    if(n===`player:${id(1)}`)return Response.json({profile:{id:id(1),name:'Actual KONKER'}});
    assert.equal(n,'ranked-matchmaking-v1');forwarded=JSON.parse(init.body);return Response.json({state:'waiting'});
  }})}};
  const response=await routeRankedMatchmaking(new Request('https://match/ranked/search',{method:'POST',
    headers:{Origin:'https://konk.world',Authorization:`Bearer ${'a'.repeat(64)}`},
    body:JSON.stringify({profileId:id(1),verifiedProfileId:id(2),verifiedName:'Fake',name:'Fake',ticket:'b'.repeat(36),action:'join'})}),env);
  assert.equal(response.status,200);assert.equal(forwarded.verifiedProfileId,id(1));assert.equal(forwarded.verifiedName,'Actual KONKER');
  assert.equal(JSON.stringify(forwarded).includes('a'.repeat(64)),false);
});
