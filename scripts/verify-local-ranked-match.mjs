import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const base=process.argv[2]??'http://localhost:8787',origin='http://localhost:4201';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('This verification may only create local test profiles.');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function call(path,body,secret){
  const response=await fetch(`${base}${path}`,{method:body?'POST':'GET',headers:{Origin:origin,
    ...(body?{'Content-Type':'application/json'}:{}),...(secret?{Authorization:`Bearer ${secret}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const result=await response.json();assert.ok(response.ok,`${path}: ${response.status} ${result.error??''}`);return result;
}
const players=Array.from({length:2},(_,i)=>({id:randomBytes(16).toString('hex'),secret:randomBytes(32).toString('hex'),ticket:randomBytes(18).toString('hex'),name:`Local ranked check ${i+1}`}));
for(const p of players)await call(`/players/${p.id}`,{id:p.id,name:p.name},p.secret);
const search=(p,action)=>call('/ranked/search',{profileId:p.id,ticket:p.ticket,action},p.secret);
assert.equal((await search(players[0],'join')).state,'waiting');
const away=await search(players[1],'join'),home=await search(players[0],'poll');
assert.equal(home.id,away.id);assert.notEqual(home.token,away.token);
for(const [index,seat]of [[0,home],[1,away]])await call(`/rooms/${home.id}/ready`,{token:seat.token,ready:true,profileId:players[index].id},players[index].secret);
let checkpoint=await call(`/rooms/${home.id}/shot`,null,home.token);
assert.equal(checkpoint.state.seq,0);
while(checkpoint.state.rules.phase!=='ended'){
  const side=checkpoint.state.rules.turn,seat=side==='home'?home:away;
  for(const s of [home,away])await call(`/rooms/${home.id}/heartbeat`,{token:s.token});
  const intent={token:seat.token,matchId:checkpoint.matchId,requestId:randomBytes(16).toString('hex'),seq:checkpoint.state.seq,cap:side==='home'?0:5,vx:0.001,vz:0};
  const result=await call(`/rooms/${home.id}/shot`,intent);
  const duplicate=await call(`/rooms/${home.id}/shot`,intent);assert.equal(duplicate.state.seq,result.state.seq);
  checkpoint=result;assert.ok(checkpoint.state.seq<=30);
}
assert.equal(checkpoint.state.result.winner,null);
const other=await call(`/rooms/${home.id}/shot`,null,away.token);
assert.equal(other.matchId,checkpoint.matchId);assert.deepEqual(other.state,checkpoint.state);
let settled=false;
for(let attempt=0;attempt<12;attempt++){
  const own=await call(`/standings/me?profileId=${players[0].id}`,null,players[0].secret);
  if(own.own.matches===1){settled=true;assert.equal(own.own.rating,1000);assert.equal(own.own.activeMatch,null);break;}
  await sleep(1000);
}
assert.ok(settled,'Alarm-backed result settlement did not finish');
const second=await call(`/standings/me?profileId=${players[1].id}`,null,players[1].secret);
assert.equal(second.own.matches,1);assert.equal(second.own.rating,1000);assert.equal(second.own.placed,false);
console.log('Verified two local profiles: one shared ranked table, ready-up, 30 server shots, duplicate intent recovery, identical final checkpoints and exactly one settled draw per player.');
