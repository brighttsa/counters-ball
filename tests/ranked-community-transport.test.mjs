import test from 'node:test';
import assert from 'node:assert/strict';
import {searchRanked,readRankedStanding} from '../src/core/ranked-community-transport.js';
test('ranked search rejects guests without contacting the server',()=>{
  assert.throws(()=>searchRanked('https://api',{}),error=>error.status===401);
});
test('ranked transports keep profile secrets out of URLs and allow anonymous standings',async()=>{
  const old=globalThis.localStorage,profile={id:'a'.repeat(32),secret:'b'.repeat(64),name:'KONKER'};
  globalThis.localStorage={getItem:()=>JSON.stringify(profile)};
  try{
    let seen;
    const fetch=async(url,init)=>{seen={url,init};return Response.json({rows:[],state:'waiting'});};
    await searchRanked('https://api',{ticket:'c'.repeat(36),action:'join',scores:{home:99}},fetch);
    assert.equal(seen.url,'https://api/ranked/search');assert.equal(seen.init.headers.Authorization,`Bearer ${profile.secret}`);
    assert.deepEqual(JSON.parse(seen.init.body),{ticket:'c'.repeat(36),action:'join',profileId:profile.id});
    await readRankedStanding('https://api',{personal:true},fetch);
    assert.equal(seen.url.includes(profile.secret),false);assert.ok(seen.url.includes('/standings/me?profileId='));
    await readRankedStanding('https://api',{},fetch);assert.equal(seen.init.headers.Authorization,undefined);
  }finally{globalThis.localStorage=old;}
});
test('release-disabled responses remain actionable instead of retrying indefinitely',async()=>{
  await assert.rejects(readRankedStanding('https://api',{},async()=>Response.json({error:'Not released'},{status:409})),error=>error.status===409&&error.message==='Not released');
});
