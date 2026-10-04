import test from 'node:test';
import assert from 'node:assert/strict';
import {limitRankedRequest,cleanupRankedLimit} from '../match-server/src/ranked-request-limits.js';
import {verifyReadyProfile} from '../match-server/src/konker-room-seat-identity.js';
function context(){const values=new Map();return {storage:{get:async key=>values.get(key),
  put:async(key,value)=>values.set(key,value),setAlarm:async()=>{},deleteAll:async()=>values.clear()}};}
test('200 players sharing a network can poll and ready up without sharing a 30-request budget',async()=>{
  const ctx=context();
  for(let i=0;i<200*17;i++)assert.equal((await limitRankedRequest(ctx,'network',1000)).status,200);
  const player=context();
  for(let i=0;i<60;i++)assert.equal((await limitRankedRequest(player,'player',1000)).status,200);
  assert.equal((await limitRankedRequest(player,'player',1000)).status,429);
  assert.equal((await limitRankedRequest(player,'player',61000)).status,200);
  assert.equal(await cleanupRankedLimit(player,121000),true);
  assert.equal(await cleanupRankedLimit(player,121000),false);
});
test('invalid credentials cannot spend a verified player request budget',async()=>{
  const id='a'.repeat(32);let spent=0;
  const env={KONK_MATCH:{idFromName:n=>n,get:()=>({fetch:async()=>Response.json({error:'bad'},{status:403})})}};
  const request=new Request('https://match/ranked/search',{headers:{Authorization:`Bearer ${'b'.repeat(64)}`}});
  const result=await verifyReadyProfile(request,env,{profileId:id},{checkLimit:async()=>Response.json({ok:true}),
    afterVerify:async()=>{spent++;return Response.json({ok:true});}});
  assert.equal(result.status,403);assert.equal(spent,0);
});
