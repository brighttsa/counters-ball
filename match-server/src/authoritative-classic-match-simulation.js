import { FlickPhysicsEngine, FIXED_STEP } from '../../src/gameplay/flick-physics-engine.js';
import { MatchRules } from '../../src/gameplay/match-rules-turns-goals-and-results.js';
import { CAMPAIGN_LEVELS } from '../../src/levels/campaign-level-definitions.js';
import { TEAM_FORMATION, CAP_RADIUS, BALL_RADIUS, GOAL_LINE_X, GOAL_HALF_WIDTH,
  MAX_FLICK_SPEED } from '../../src/core/pitch-dimensions-and-constants.js';
import { OBSTACLE_RADIUS } from '../../src/scene/table-obstacles-pebbles-bottles-coins.js';

export const SIMULATION_VERSION = 'server-v1';
const MAX_STEPS = 12 / FIXED_STEP;
const MAX_SPEED = MAX_FLICK_SPEED * 1.08; // The existing drag gesture permits an 8% draw boost.
const fail = (message, status = 409) => { throw Object.assign(new Error(message), { status }); };

export function classicLevel(id) {
  const level = CAMPAIGN_LEVELS.find(candidate => candidate.id === id);
  if (!level) fail('server simulation requires a classic venue', 400);
  return level;
}

function world(level) {
  const physics = new FlickPhysicsEngine({ frictionScale: level.frictionScale });
  // Competitive collision radii are uniform and supplied in the server snapshot.
  // Legacy scenery varies cap scale cosmetically; its client snapshots are never trusted here.
  for (const [side,mirror] of [['home',1],['away',-1]]) {
    for (const [x,z] of TEAM_FORMATION) physics.addBody({x:x*mirror,z,radius:CAP_RADIUS,mass:1,kind:'cap',side});
  }
  physics.addBody({x:0,z:0,radius:BALL_RADIUS,mass:0.12,kind:'ball'});
  for (const sign of [-1,1]) for (const zsign of [-1,1]) {
    physics.addStaticCircle({x:sign*GOAL_LINE_X,z:zsign*GOAL_HALF_WIDTH,radius:0.02,kind:'post'});
  }
  for (const {type,x,z} of level.obstacles) physics.addStaticCircle({x,z,radius:OBSTACLE_RADIUS[type],kind:type});
  const rules = new MatchRules(level.rules,{home:'remote',away:'remote'});
  rules.start();
  return {physics,rules};
}

export function createClassicState(levelId) {
  const {physics,rules}=world(classicLevel(levelId));
  return {version:SIMULATION_VERSION,levelId,seq:0,table:Array.from(physics.snapshot()),
    bodies:physics.bodies.map(({kind,side,radius})=>({kind,side,radius})),rules:rules.snapshot(),result:null};
}

export function simulateClassicShot(state, side, intent) {
  if (state.version!==SIMULATION_VERSION) fail('unsupported simulation version');
  if (intent.seq!==state.seq) fail('stale shot sequence');
  const level=classicLevel(state.levelId), {physics,rules}=world(level);
  physics.restore(state.table);rules.restore(state.rules);
  if (!rules.canFlick(side)) fail('not your turn');
  const cap=physics.bodies[intent.cap];
  if (!Number.isInteger(intent.cap) || cap?.kind!=='cap' || cap.side!==side) fail('not your cap',403);
  const {vx,vz}=intent;
  if (![vx,vz].every(Number.isFinite) || Math.hypot(vx,vz)<=0 || Math.hypot(vx,vz)>MAX_SPEED+1e-9) fail('invalid shot velocity',400);
  rules.registerFlick(side);physics.clearBankTouches();cap.vel.set(vx,vz);
  let goal=0,steps=0;
  const positions=()=>physics.bodies.slice(0,11).flatMap(body=>[body.pos.x,body.pos.y]);
  const frames=[{time:0,positions:positions()}];
  const contacts=[];
  physics.onImpact=(a,b,impulse,x,z)=>contacts.push({kind:'impact',a:physics.bodies.indexOf(a),b:physics.bodies.indexOf(b),impulse,x,z,time:(steps+1)*FIXED_STEP});
  physics.onWallHit=(body,impulse,x,z)=>contacts.push({kind:'wall',a:physics.bodies.indexOf(body),impulse,x,z,time:(steps+1)*FIXED_STEP});
  physics.onGoalScored=sign=>{goal=sign;rules.registerGoal(sign);};
  while (steps<MAX_STEPS && !goal && !physics.allBodiesResting()) {
    physics.stepFixed(FIXED_STEP);steps++;
    if (steps%8===0) frames.push({time:steps*FIXED_STEP,positions:positions()});
  }
  if (frames.at(-1).time!==steps*FIXED_STEP) frames.push({time:steps*FIXED_STEP,positions:positions()});
  if (!goal && !physics.allBodiesResting()) fail('shot simulation did not settle',422);
  const outcome=physics.bodies.slice(0,11).flatMap(body=>[body.pos.x,body.pos.y]);
  if (goal) {
    physics.bodies.forEach(body=>body.vel.set(0,0));
    rules.on('kickoff',()=>{
      const opening=world(level).physics;
      physics.restore(opening.snapshot());
    });
    rules.finishGoalCelebration();
  } else rules.resolvePlayAtRest();
  return {...state,seq:state.seq+1,table:Array.from(physics.snapshot()),rules:rules.snapshot(),
    result:rules.result,goal,lastShot:{cap:intent.cap,vx,vz,side,steps,outcome,frames,contacts}};
}
