// Fixed-step 2D circle physics on the table plane (Vector2 .x = world x,
// .y = world z). Dusty friction, cap/ball/obstacle collisions, batten walls,
// swept goal detection, impact events for feedback, and cheap cloning so the
// AI can rehearse shots on an identical copy of the table.
import * as THREE from 'three';
import {
  WALL_HALF_LENGTH as WX, WALL_HALF_WIDTH as WZ, GOAL_LINE_X, GOAL_HALF_WIDTH,
} from '../core/pitch-dimensions-and-constants.js';

export const FIXED_STEP = 1 / 240;
const REST_SPEED = 0.015;
const WALL_RESTITUTION = 0.55;
const BODY_RESTITUTION = 0.72;
const GOAL_DEPTH = GOAL_LINE_X + 0.03; // counts a little past the chalk so dying shots don't score
const MIN_EVENT_IMPULSE = 0.02;

export class FlickPhysicsEngine {
  constructor({ frictionScale = 1 } = {}) {
    this.frictionScale = frictionScale;
    this.bodies = [];
    this.accumulator = 0;
    this.goalCooldown = false;
    this.onGoalScored = null; // (sign: -1|1)
    this.onImpact = null;     // (a, b, impulse, x, z)
    this.onWallHit = null;    // (body, impulse, x, z)
  }

  addBody({ x, z, radius, mass, kind, side = null }) {
    const isBall = kind === 'ball';
    const body = {
      kind, side, radius, mass, invMass: 1 / mass,
      pos: new THREE.Vector2(x, z), prev: new THREE.Vector2(x, z), vel: new THREE.Vector2(),
      // The paper ball skims with less drag; heavy caps grind to a dusty stop.
      linearDamping: (isBall ? 1.0 : 1.7) * this.frictionScale,
      constantFriction: (isBall ? 0.14 : 0.32) * this.frictionScale,
    };
    this.bodies.push(body);
    return body;
  }

  addStaticCircle({ x, z, radius, kind }) {
    const body = {
      kind, side: null, radius, mass: 0, invMass: 0,
      pos: new THREE.Vector2(x, z), prev: new THREE.Vector2(x, z), vel: new THREE.Vector2(),
      linearDamping: 0, constantFriction: 0,
    };
    this.bodies.push(body);
    return body;
  }

  allBodiesResting() {
    return this.bodies.every((b) => b.vel.x === 0 && b.vel.y === 0);
  }

  resetGoalCooldown() {
    this.goalCooldown = false;
  }

  advance(dt) {
    this.accumulator = Math.min(this.accumulator + dt, 0.1);
    while (this.accumulator >= FIXED_STEP) {
      this.stepFixed(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }
  }

  stepFixed(h) {
    this.integrate(h);
    this.resolveBodyCollisions();
    this.resolveWalls();
  }

  integrate(h) {
    for (const b of this.bodies) {
      if (b.invMass === 0) continue;
      b.prev.copy(b.pos);
      const speed = b.vel.length();
      if (speed === 0) continue;
      const next = Math.max(0, speed - (b.linearDamping * speed + b.constantFriction) * h);
      if (next < REST_SPEED) b.vel.set(0, 0);
      else b.vel.multiplyScalar(next / speed);
      b.pos.addScaledVector(b.vel, h);
    }
  }

  resolveBodyCollisions() {
    const bodies = this.bodies;
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        const totalInv = a.invMass + b.invMass;
        if (totalInv === 0) continue;
        // Overlap is tested before any velocity shortcut: a cluster pushed together can come to
        // rest interpenetrating, and must still be separated. Squared distance keeps this cheap.
        let nx = b.pos.x - a.pos.x, nz = b.pos.y - a.pos.y;
        const minDist = a.radius + b.radius, distSq = nx * nx + nz * nz;
        if (distSq >= minDist * minDist || distSq === 0) continue;
        const dist = Math.sqrt(distSq);
        nx /= dist; nz /= dist;
        const push = (minDist - dist) / totalInv;
        a.pos.x -= nx * push * a.invMass; a.pos.y -= nz * push * a.invMass;
        b.pos.x += nx * push * b.invMass; b.pos.y += nz * push * b.invMass;
        const relVel = (b.vel.x - a.vel.x) * nx + (b.vel.y - a.vel.y) * nz;
        if (relVel > 0) continue;
        const impulse = (-(1 + BODY_RESTITUTION) * relVel) / totalInv;
        a.vel.x -= nx * impulse * a.invMass; a.vel.y -= nz * impulse * a.invMass;
        b.vel.x += nx * impulse * b.invMass; b.vel.y += nz * impulse * b.invMass;
        if (this.onImpact && impulse > MIN_EVENT_IMPULSE) {
          this.onImpact(a, b, impulse, a.pos.x + nx * a.radius, a.pos.y + nz * a.radius);
        }
      }
    }
  }

  resolveWalls() {
    for (const b of this.bodies) {
      if (b.invMass === 0) continue; // static circles never move
      // Swept goal test: where did the ball cross the goal plane this step?
      if (!this.goalCooldown && b.kind === 'ball'
          && Math.abs(b.pos.x) > GOAL_DEPTH && Math.abs(b.prev.x) <= GOAL_DEPTH) {
        const sign = Math.sign(b.pos.x);
        const t = (sign * GOAL_DEPTH - b.prev.x) / (b.pos.x - b.prev.x);
        const zAtCrossing = b.prev.y + (b.pos.y - b.prev.y) * t;
        if (Math.abs(zAtCrossing) < GOAL_HALF_WIDTH - b.radius) {
          this.goalCooldown = true;
          this.onGoalScored?.(sign);
        }
      }
      this.bounceAxis(b, 'x', WX);
      this.bounceAxis(b, 'y', WZ);
    }
  }

  bounceAxis(b, axis, limit) {
    const overMin = b.pos[axis] - b.radius < -limit;
    const overMax = b.pos[axis] + b.radius > limit;
    if (!overMin && !overMax) return;
    const into = overMin ? -b.vel[axis] : b.vel[axis];
    b.pos[axis] = overMin ? -limit + b.radius : limit - b.radius;
    if (into <= 0) return;
    b.vel[axis] = (overMin ? into : -into) * WALL_RESTITUTION;
    const impulse = into * (1 + WALL_RESTITUTION) * b.mass;
    if (this.onWallHit && impulse > MIN_EVENT_IMPULSE) this.onWallHit(b, impulse, b.pos.x, b.pos.y);
  }

  /** Identical copy (no callbacks) for AI shot rehearsal. Body order is preserved. */
  cloneForSimulation() {
    const sim = new FlickPhysicsEngine({ frictionScale: this.frictionScale });
    sim.bodies = this.bodies.map((b) => ({
      ...b, pos: b.pos.clone(), prev: b.prev.clone(), vel: b.vel.clone(),
    }));
    return sim;
  }

  snapshot() {
    const s = new Float64Array(this.bodies.length * 4);
    this.bodies.forEach((b, i) => s.set([b.pos.x, b.pos.y, b.vel.x, b.vel.y], i * 4));
    return s;
  }

  restore(s) {
    this.bodies.forEach((b, i) => {
      b.pos.set(s[i * 4], s[i * 4 + 1]);
      b.prev.copy(b.pos);
      b.vel.set(s[i * 4 + 2], s[i * 4 + 3]);
    });
    this.goalCooldown = false;
  }

  /** Run until everything settles or a goal; returns goal sign (0 = none). */
  simulateUntilRest(maxSeconds = 3.5) {
    let goal = 0;
    this.onGoalScored = (sign) => { goal = sign; };
    const steps = Math.ceil(maxSeconds / FIXED_STEP);
    for (let i = 0; i < steps && !goal; i++) {
      this.stepFixed(FIXED_STEP);
      if (i % 12 === 0 && this.allBodiesResting()) break;
    }
    return goal;
  }
}
