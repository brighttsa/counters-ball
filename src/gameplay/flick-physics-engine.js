// Fixed-step 2D circle physics on the table plane (Vector2 .x = world x,
// .y = world z). Dusty friction, cap/ball/obstacle collisions, batten walls,
// swept goal detection, impact events for feedback, and cheap cloning so the
// AI can rehearse shots on an identical copy of the table.
import * as THREE from 'three';
import {
  WALL_HALF_LENGTH as WX, WALL_HALF_WIDTH as WZ,
} from '../core/pitch-dimensions-and-constants.js';
import { createStaticSegment, cloneSegment, resolveSegmentContacts } from './static-segment-collisions.js';
import { checkGoalCrossing, noteBankTouch, noteRailBank, clearBankTouches } from './goal-line-crossing-detection.js';
import { RAIL_RESTITUTION, RAIL_GRIP, contactRestitution, settleFriction } from './flick-feel-contact-rail-and-settle-rules.js';

export const FIXED_STEP = 1 / 240;
const REST_SPEED = 0.015;
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
    this.onStep = null;       // presentation observer; omitted from AI clones
    // Goal mouth centre (z) per end: +1 = the goal home attacks. Moving-goal venues slide these.
    this.goalCenters = { 1: 0, [-1]: 0 };
    this.segments = [];       // straight static edges (a ruler on its edge)
    this.goalRequiresTouchOf = null; // e.g. ['pot', 'rail']: only banked goals count (see goal-line-crossing-detection)
    this.onGoalDenied = null; // (sign) a crossing that the bank rule refused
  }

  addStaticSegment(spec) {
    const segment = createStaticSegment(spec);
    this.segments.push(segment);
    return segment;
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

  /** Start of a flick: the bank rule only credits touches made on this flick. */
  clearBankTouches() { clearBankTouches(this); }

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
    if (this.segments.length) resolveSegmentContacts(this);
    this.resolveWalls();
    this.onStep?.(h);
  }

  integrate(h) {
    for (const b of this.bodies) {
      if (b.invMass === 0) continue;
      b.prev.copy(b.pos);
      const speed = b.vel.length();
      if (speed === 0) continue;
      const friction = b.constantFriction + settleFriction(speed, this.frictionScale);
      const next = Math.max(0, speed - (b.linearDamping * speed + friction) * h);
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
        if (totalInv === 0 || a.disabled || b.disabled) continue; // raised toll booms let play through
        if ((a.blocksOnly && a.blocksOnly !== b.kind) || (b.blocksOnly && b.blocksOnly !== a.kind)) continue; // low caps slide under booms
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
        const rx = b.vel.x - a.vel.x, rz = b.vel.y - a.vel.y;
        const relVel = rx * nx + rz * nz;
        if (relVel > 0) continue;
        if (relVel < -0.02) noteBankTouch(this, a, b); // a real impact, not a ball resting against a pot
        const restitution = contactRestitution(-relVel, Math.hypot(rx, rz));
        const impulse = (-(1 + restitution) * relVel) / totalInv;
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
      checkGoalCrossing(this, b);
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
    noteRailBank(this, b);
    b.vel[axis] = (overMin ? into : -into) * RAIL_RESTITUTION;
    b.vel[axis === 'x' ? 'y' : 'x'] *= RAIL_GRIP; // the rail bites along its length too
    const impulse = into * (1 + RAIL_RESTITUTION) * b.mass;
    if (this.onWallHit && impulse > MIN_EVENT_IMPULSE) this.onWallHit(b, impulse, b.pos.x, b.pos.y);
  }

  /** Identical copy (no callbacks) for AI shot rehearsal. Body order is preserved. */
  cloneForSimulation() {
    const sim = new FlickPhysicsEngine({ frictionScale: this.frictionScale });
    sim.goalCenters = { ...this.goalCenters };
    sim.segments = this.segments.map(cloneSegment);
    sim.goalRequiresTouchOf = this.goalRequiresTouchOf;
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
    clearBankTouches(this); // each rehearsal is a fresh flick
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
