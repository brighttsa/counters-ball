// AI shot planning by rehearsal: clone the table, try candidate flicks
// (ghost-ball aims at goal targets, clearances, random samples), simulate each
// to rest, and score the outcome. Difficulty is sample budget + human-like
// execution error + a chance of settling for a lesser shot. Because shots are
// simulated, obstacles, rebounds and bank shots are understood for free.
import * as THREE from 'three';
import { supportPointBehindBall, scoreShotAccess } from './ai-positional-shot-evaluation.js';
import { attackDirection, GOAL_LINE_X, MAX_FLICK_SPEED } from '../core/pitch-dimensions-and-constants.js';

export const AI_DIFFICULTY = {
  rookie: { targets: [0], powers: [0.55, 0.85], randomSamples: 3, aimNoise: 0.16, powerNoise: 0.2, blunder: 0.35, think: 0.9 },
  easy: { targets: [0, 0.13], powers: [0.5, 0.75, 1], randomSamples: 4, aimNoise: 0.1, powerNoise: 0.14, blunder: 0.2, think: 0.8 },
  medium: { targets: [0, 0.13, -0.13], powers: [0.45, 0.7, 0.95], randomSamples: 6, aimNoise: 0.055, powerNoise: 0.1, blunder: 0.1, think: 0.7 },
  hard: { targets: [0, 0.12, -0.12, 0.19, -0.19], powers: [0.4, 0.6, 0.8, 1], randomSamples: 9, aimNoise: 0.03, powerNoise: 0.06, blunder: 0.04, think: 0.6 },
  champion: { targets: [0, 0.12, -0.12, 0.19, -0.19], powers: [0.35, 0.5, 0.65, 0.8, 1], randomSamples: 14, aimNoise: 0.015, powerNoise: 0.035, blunder: 0, think: 0.5 },
};

const SIMS_PER_FRAME = 6;

function gaussian(rng) {
  const u = 1 - rng(), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function candidateShots(cap, ball, side, difficulty, rng, mechanic, goalZ = 0) {
  const shots = [];
  const add = (dx, dz, powers) => {
    const len = Math.hypot(dx, dz);
    if (len > 1e-6) powers.forEach((power) => shots.push({ dx: dx / len, dz: dz / len, power }));
  };
  const toBallX = ball.pos.x - cap.pos.x, toBallZ = ball.pos.y - cap.pos.y;
  const toBallLen = Math.hypot(toBallX, toBallZ) || 1;
  const contact = cap.radius + ball.radius;

  for (const targetZ of difficulty.targets) {
    // Ghost ball: where the cap must be at contact to send the ball at the target.
    const gx = attackDirection(side) * GOAL_LINE_X * 1.04 - ball.pos.x, gz = goalZ + targetZ - ball.pos.y;
    const gl = Math.hypot(gx, gz) || 1;
    const ax = ball.pos.x - (gx / gl) * contact - cap.pos.x;
    const az = ball.pos.y - (gz / gl) * contact - cap.pos.y;
    const cut = (ax * toBallX + az * toBallZ) / ((Math.hypot(ax, az) || 1) * toBallLen);
    if (cut >= 0.35) add(ax, az, difficulty.powers); // skip cuts too thin to make
  }
  // Venue mechanics add their own ideas: aim the ball through an open lane, or park a cap to block.
  const extra = mechanic?.aiCandidates(side);
  for (const point of extra?.ballTargets ?? []) {
    const px = point.x - ball.pos.x, pz = point.z - ball.pos.y, pl = Math.hypot(px, pz) || 1;
    add(ball.pos.x - (px / pl) * contact - cap.pos.x, ball.pos.y - (pz / pl) * contact - cap.pos.y, difficulty.powers);
  }
  for (const point of extra?.blockPoints ?? []) add(point.x - cap.pos.x, point.z - cap.pos.y, [0.3, 0.45, 0.6]);
  // A useful setup is better than a random sideways flick when no shot is open.
  const support = supportPointBehindBall(ball, side);
  add(support.x - cap.pos.x, support.z - cap.pos.y, [0.2, 0.4, 0.65]);
  add(toBallX, toBallZ, [0.4, 0.8]); // straight through the ball: a clearance
  for (let i = 0; i < difficulty.randomSamples; i++) {
    const a = rng() * Math.PI * 2;
    shots.push({ dx: Math.cos(a), dz: Math.sin(a), power: 0.3 + rng() * 0.7 });
  }
  return shots;
}

function scoreOutcome(sim, side, ballIndex, goal, mechanic) {
  const dir = attackDirection(side);
  if (goal === dir) return 10000;
  if (goal === -dir) return -10000;

  const ball = sim.bodies[ballIndex].pos;
  const ownZ = sim.goalCenters?.[-dir] ?? 0, theirZ = sim.goalCenters?.[dir] ?? 0; // goals may sit off-centre
  let score = ball.x * dir * 120; // territory
  const dOwn = Math.hypot(ball.x + dir * GOAL_LINE_X, ball.y - ownZ);
  if (dOwn < 0.75) score -= (0.75 - dOwn) * 600;
  score += Math.max(0, 0.9 - Math.hypot(ball.x - dir * GOAL_LINE_X, ball.y - theirZ)) * 180; // chance next turn

  const toOwnX = -dir * GOAL_LINE_X - ball.x, toOwnZ = ownZ - ball.y;
  const toOwnLen = Math.hypot(toOwnX, toOwnZ) || 1;
  for (const b of sim.bodies) {
    if (b.kind !== 'cap') continue;
    if (b.side === side) { // reward keeping a cap home in the goal mouth
      if (Math.abs(b.pos.x + dir * GOAL_LINE_X) < 0.35 && Math.abs(b.pos.y - ownZ) < 0.3) score += 25;
      continue;
    }
    // Counter-attack risk: an opponent cap lined up behind the ball, facing our goal.
    const cx = ball.x - b.pos.x, cz = ball.y - b.pos.y, d = Math.hypot(cx, cz) || 1;
    const aligned = (cx * toOwnX + cz * toOwnZ) / (d * toOwnLen);
    if (aligned > 0.6 && d < 0.8) score -= (0.8 - d) * aligned * 160;
  }
  return score + scoreShotAccess(sim, side, ballIndex) + (mechanic?.aiScore(sim, side, ballIndex) ?? 0);
}

/**
 * @param mechanic optional venue mechanic: { aiCandidates(side), aiScore(sim, side, ballIndex) }
 * @returns {Promise<{ body, velocity: THREE.Vector2 } | null>} null if cancelled
 */
export async function planAiShot({ physics, side, capBodies, ballBody, difficulty, rng, yieldToFrame, isCancelled, mechanic = null }) {
  const sim = physics.cloneForSimulation();
  const base = sim.snapshot();
  const ballIndex = physics.bodies.indexOf(ballBody);
  const evaluated = [];
  let sinceYield = 0;

  for (const cap of capBodies) {
    const capIndex = physics.bodies.indexOf(cap);
    for (const shot of candidateShots(cap, ballBody, side, difficulty, rng, mechanic, physics.goalCenters?.[attackDirection(side)])) {
      sim.restore(base);
      const speed = shot.power * MAX_FLICK_SPEED;
      sim.bodies[capIndex].vel.set(shot.dx * speed, shot.dz * speed);
      const goal = sim.simulateUntilRest(3.5);
      evaluated.push({ cap, shot, score: scoreOutcome(sim, side, ballIndex, goal, mechanic) });
      if (++sinceYield >= SIMS_PER_FRAME) {
        sinceYield = 0;
        await yieldToFrame(); // spread the search across frames: no hitches
        if (isCancelled()) return null;
      }
    }
  }
  if (!evaluated.length) return null;

  evaluated.sort((a, b) => b.score - a.score);
  const pool = rng() < difficulty.blunder ? Math.min(evaluated.length, 6) : 1;
  const choice = evaluated[Math.floor(rng() * pool)];
  const angle = Math.atan2(choice.shot.dz, choice.shot.dx) + gaussian(rng) * difficulty.aimNoise;
  const power = THREE.MathUtils.clamp(choice.shot.power * (1 + gaussian(rng) * difficulty.powerNoise), 0.2, 1);
  return {
    body: choice.cap,
    velocity: new THREE.Vector2(Math.cos(angle), Math.sin(angle)).multiplyScalar(power * MAX_FLICK_SPEED),
  };
}
