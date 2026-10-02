import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, THREE } from './helpers/real-three-session-fixture.mjs';
import { createAuthoritativeCheckpointPlayback } from '../src/gameplay/authoritative-room-checkpoint-playback.js';

function setup(){
  const {s,calls}=fixture();
  s.physics.bodies=[];s.entries=[];
  for(let i=0;i<10;i++){
    const side=i<5?'home':'away';
    const body=s.physics.addBody({x:(i%5)*0.35-0.7,z:i<5?-1:1,radius:0.08,mass:1,kind:'cap',side});
    s.entries.push({side,body,home:[body.pos.x,body.pos.y],pivot:new THREE.Object3D(),mesh:new THREE.Object3D()});
  }
  s.ballBody=s.physics.addBody({x:0,z:0,radius:0.035,mass:0.12,kind:'ball'});
  const initial={table:s.physics.snapshot(),bodies:s.physics.bodies.map(b=>({kind:b.kind,side:b.side,radius:b.radius})),
    rules:s.rules.snapshot(),result:null};
  const flat=s.physics.bodies.flatMap(b=>[b.pos.x,b.pos.y]);
  const final=flat.map((v,i)=>i===0?v+0.2:v);
  const next={...structuredClone(initial),lastShot:{cap:0,vx:1,vz:0,contacts:[],frames:[{time:0,positions:flat},{time:0.2,positions:final}]}};
  next.table[0]+=0.2;
  const adapter=createAuthoritativeCheckpointPlayback(s,'home');
  return {s,calls,initial,next,adapter};
}
test('server body radii replace cosmetic collision scale',()=>{
  const f=setup();try{f.initial.bodies[0].radius=0.085;f.adapter.apply(f.initial);assert.equal(f.s.entries[0].body.radius,0.085);}
  finally{f.adapter.close();}
});
test('real session plays trajectory, pauses and settles at canonical checkpoint',async()=>{
  const f=setup();try{
    f.adapter.apply(f.initial);const playing=f.adapter.play(f.next);
    f.s.paused=true;f.s.update(0.1,0);assert.equal(f.s.entries[0].body.pos.x,f.initial.table[0]);
    f.s.paused=false;f.s.update(0.1,0.1);f.s.update(0.1,0.2);await playing;
    f.adapter.apply(f.next);assert.deepEqual(f.s.physics.snapshot(),f.next.table);
    assert.ok(f.calls.some(c=>c[0]==='sound.flick'));
  }finally{f.adapter.close();}
});
test('invalid radii and trajectory are rejected before playback',()=>{
  const f=setup();try{
    const bad=structuredClone(f.initial);bad.bodies[0].radius=NaN;
    assert.throws(()=>f.adapter.apply(bad),/Checkpoint/);
    f.next.lastShot.frames[1].positions[0]=Infinity;
    assert.throws(()=>f.adapter.play(f.next),/trajectory/);
  }finally{f.adapter.close();}
});
test('leaving during playback resolves work and restores session methods',async()=>{
  const f=setup();const playing=f.adapter.play(f.next);f.adapter.close();await playing;
  assert.equal(f.s.update,Object.getPrototypeOf(f.s).update);
});
