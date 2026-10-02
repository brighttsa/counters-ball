const sameBody=(a,b)=>a.kind===b.kind && a.side===b.side;

export function createAuthoritativeCheckpointPlayback(session,mySide) {
  const original={flick:session.flick,update:session.update,finishGoal:session.rules.finishGoalCelebration};
  let closed=false,playback=null,submit=null,locked=true;
  function validate(state){
    if(state.table?.length!==session.physics.bodies.length*4 || state.bodies?.length!==session.physics.bodies.length
      || !state.table.every(Number.isFinite) || !state.bodies.every((body,index)=>Number.isFinite(body.radius)
        && body.radius>0 && sameBody(body,session.physics.bodies[index])))throw Error('Checkpoint does not fit this venue');
  }
  function lock(value){
    locked=value;session.rules.controllers[mySide]=value?'remote':'human';
    if(value)session.input.cancel();
  }
  function positions(flat){
    if(flat.length!==22 || !flat.every(Number.isFinite))throw Error('Invalid shot trajectory');
    session.physics.bodies.slice(0,11).forEach((body,index)=>{
      body.pos.set(flat[index*2],flat[index*2+1]);body.prev.copy(body.pos);body.vel.set(0,0);
    });
  }
  const apply=state=>{
    validate(state);session.timers=[];session.time.reset();
    state.bodies.forEach((body,index)=>{session.physics.bodies[index].radius=body.radius;});
    session.physics.restore(state.table);session.physics.accumulator=0;
    session.rules.restore(state.rules);session.syncMeshes(0);
    session.hud.setScore(state.rules.scores);
    session.hud.setFlicks(session.rules.flicksLeft('home'),session.rules.flicksLeft('away'));
    if(state.rules.phase==='ended'){session.rules.result=structuredClone(state.result);session.rules.emit('end',session.rules.result);}
    else session.rules.emit('turn',state.rules.turn);
  };
  session.rules.finishGoalCelebration=()=>{}; // Only a server checkpoint may hand over or end the match.
  session.flick=(entry,velocity)=>{
    if(!closed && !locked && entry.side===mySide && session.rules.canFlick(mySide))void submit?.(session.entries.indexOf(entry),velocity.x,velocity.y);
  };
  session.update=function(dt,t){
    if(closed || this.paused || this.disposed)return;
    if(playback){
      const p=playback,frames=p.state.lastShot.frames;
      p.time+=Math.min(dt,0.1);
      while(p.index<frames.length-2 && frames[p.index+1].time<p.time)p.index++;
      const a=frames[p.index],b=frames[Math.min(p.index+1,frames.length-1)];
      const mix=b.time===a.time?1:Math.min(1,Math.max(0,(p.time-a.time)/(b.time-a.time)));
      positions(a.positions.map((value,index)=>value+(b.positions[index]-value)*mix));
      const contacts=p.state.lastShot.contacts??[];
      while(p.contact<contacts.length && contacts[p.contact].time<=p.time){
        const c=contacts[p.contact++],body=session.physics.bodies[c.a];
        if(c.kind==='impact')session.physics.onImpact?.(body,session.physics.bodies[c.b],c.impulse,c.x,c.z);
        else session.physics.onWallHit?.(body,c.impulse,c.x,c.z);
      }
      if(p.time>=frames.at(-1).time && !p.completed){
        p.completed=true;
        if(p.state.goal){session.rules.registerGoal(p.state.goal);p.until=p.time+2.6;}
        else p.until=p.time;
      }
      if(p.completed && p.time>=p.until){playback=null;p.resolve();}
    }
    original.update.call(this,dt,t);
  };
  return {
    apply,lock,setSubmit(fn){submit=fn;},
    play(state){
      validate(state);
      const frames=state.lastShot.frames;
      if(!Array.isArray(frames) || !frames.length || frames.some((frame,index)=>!Number.isFinite(frame.time)
        || frame.time<0 || (index && frame.time<frames[index-1].time) || frame.positions?.length!==22
        || !frame.positions.every(Number.isFinite)))throw Error('Invalid shot trajectory');
      session.rules.phase='waiting';session.input.cancel();session.physics.bodies.forEach(body=>body.vel.set(0,0));
      session.physics.goalCooldown=true;
      const entry=session.entries[state.lastShot.cap];
      const velocity=entry.body.vel.clone().set(state.lastShot.vx,state.lastShot.vz);
      session.presentation.begin(entry,velocity,null);
      session.visuals.release?.(entry.body,velocity);session.juice.release(entry,velocity.length()/3.4);
      session.sound.flick(velocity.length()/3.4);
      return new Promise(resolve=>{playback={state,resolve,index:0,contact:0,time:0,completed:false};});
    },
    close(){if(closed)return;closed=true;playback?.resolve();playback=null;
      session.flick=original.flick;session.update=original.update;session.rules.finishGoalCelebration=original.finishGoal;},
  };
}
