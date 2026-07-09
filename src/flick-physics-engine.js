// Lightweight 2D circle physics on the table plane (x, z). Handles dusty
// friction, cap/ball collisions, batten walls, goal mouths and static posts.
import * as THREE from 'three';
import {
  WALL_HALF_LENGTH as WX, WALL_HALF_WIDTH as WZ,
  GOAL_LINE_X, GOAL_HALF_WIDTH,
} from './pitch-dimensions-and-constants.js';

const REST_EPSILON = 0.0004; // speed² below which a body settles
const WALL_RESTITUTION = 0.55;
const BODY_RESTITUTION = 0.72;

export class FlickPhysicsEngine {
  constructor() {
    this.bodies = [];
    this.onGoalScored = null; // (sideCrossed: -1|1) => void
    this.goalCooldown = false;
  }

  addBody({ mesh, x, z, radius, mass, kind, team = null }) {
    const body = {
      mesh, kind, team, radius, mass,
      invMass: mass > 0 ? 1 / mass : 0,
      pos: new THREE.Vector2(x, z),
      prev: new THREE.Vector2(x, z),
      vel: new THREE.Vector2(0, 0),
      // Paper ball skims with less drag; heavy caps grind to a dusty stop.
      linearDamping: kind === 'ball' ? 1.0 : 1.7,
      constantFriction: kind === 'ball' ? 0.14 : 0.32,
    };
    this.bodies.push(body);
    return body;
  }

  addStaticPost({ x, z, radius }) {
    this.bodies.push({
      kind: 'post', radius, mass: 0, invMass: 0,
      pos: new THREE.Vector2(x, z), vel: new THREE.Vector2(0, 0),
      linearDamping: 0, constantFriction: 0, mesh: null,
    });
  }

  allBodiesResting() {
    return this.bodies.every((b) => b.vel.lengthSq() < REST_EPSILON);
  }

  step(dt) {
    const sub = 4, h = Math.min(dt, 0.033) / sub;
    for (let s = 0; s < sub; s++) {
      this.integrate(h);
      this.resolveBodyCollisions();
      this.resolveWalls();
    }
  }

  integrate(h) {
    for (const b of this.bodies) {
      if (b.invMass === 0) continue;
      b.prev.copy(b.pos); // kept for the swept goal-line crossing test
      const speed = b.vel.length();
      if (speed > 0) {
        const drop = b.linearDamping * speed * h + b.constantFriction * h;
        const next = Math.max(0, speed - drop);
        if (next < 0.015) b.vel.set(0, 0);
        else b.vel.multiplyScalar(next / speed);
      }
      b.pos.addScaledVector(b.vel, h);
    }
  }

  resolveBodyCollisions() {
    const n = new THREE.Vector2();
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const a = this.bodies[i], b = this.bodies[j];
        if (a.invMass === 0 && b.invMass === 0) continue;
        n.subVectors(b.pos, a.pos);
        const dist = n.length(), minDist = a.radius + b.radius;
        if (dist >= minDist || dist === 0) continue;
        n.divideScalar(dist);
        // Positional correction, split by inverse mass.
        const totalInv = a.invMass + b.invMass;
        const push = (minDist - dist) / totalInv;
        a.pos.addScaledVector(n, -push * a.invMass);
        b.pos.addScaledVector(n, push * b.invMass);
        // Impulse along the normal.
        const relVel = (b.vel.x - a.vel.x) * n.x + (b.vel.y - a.vel.y) * n.y;
        if (relVel > 0) continue;
        const impulse = (-(1 + BODY_RESTITUTION) * relVel) / totalInv;
        a.vel.addScaledVector(n, -impulse * a.invMass);
        b.vel.addScaledVector(n, impulse * b.invMass);
      }
    }
  }

  resolveWalls() {
    // Goal counts a little past the chalk line so shots dying on it don't score.
    const goalX = GOAL_LINE_X + 0.03;
    for (const b of this.bodies) {
      if (b.invMass === 0) continue; // static posts never move or trigger walls
      // Swept goal test: interpolate where the ball crossed the goal plane this
      // substep, so a very fast ball can't tunnel past the check undetected.
      if (!this.goalCooldown && b.kind === 'ball'
          && Math.abs(b.pos.x) > goalX && Math.abs(b.prev.x) <= goalX) {
        const side = Math.sign(b.pos.x);
        const t = (side * goalX - b.prev.x) / (b.pos.x - b.prev.x);
        const zAtCrossing = b.prev.y + (b.pos.y - b.prev.y) * t;
        if (Math.abs(zAtCrossing) < GOAL_HALF_WIDTH - b.radius) {
          this.goalCooldown = true;
          this.onGoalScored?.(side);
        }
      }
      if (b.pos.x - b.radius < -WX) { b.pos.x = -WX + b.radius; b.vel.x = Math.abs(b.vel.x) * WALL_RESTITUTION; }
      if (b.pos.x + b.radius > WX) { b.pos.x = WX - b.radius; b.vel.x = -Math.abs(b.vel.x) * WALL_RESTITUTION; }
      if (b.pos.y - b.radius < -WZ) { b.pos.y = -WZ + b.radius; b.vel.y = Math.abs(b.vel.y) * WALL_RESTITUTION; }
      if (b.pos.y + b.radius > WZ) { b.pos.y = WZ - b.radius; b.vel.y = -Math.abs(b.vel.y) * WALL_RESTITUTION; }
    }
  }
}
