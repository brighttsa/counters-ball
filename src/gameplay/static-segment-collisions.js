// Straight static edges for the circle physics: a ruler standing on its edge
// is a segment with a thickness (a capsule). Moving bodies bounce off it like
// off a wall at any angle. Segments are static between turns; venue mechanics
// may re-aim one only while everything rests.
import * as THREE from 'three';
import { closestPointOnSegment } from './segment-geometry-helpers.js';

const SEGMENT_RESTITUTION = 0.72;
const MIN_EVENT_IMPULSE = 0.02;

/** A static segment record, shaped like a body so impact feedback can treat it as one. */
export function createStaticSegment({ ax, az, bx, bz, radius, kind }) {
  return { ax, az, bx, bz, radius, kind, mass: 0, invMass: 0, disabled: false,
    pos: new THREE.Vector2(), vel: new THREE.Vector2() };
}

export function cloneSegment(s) {
  return { ...s, pos: s.pos.clone(), vel: s.vel.clone() };
}

/** Push moving bodies out of every enabled segment and reflect their approach. */
export function resolveSegmentContacts(engine) {
  for (const s of engine.segments) {
    if (s.disabled) continue;
    for (const b of engine.bodies) {
      if (b.invMass === 0) continue;
      const c = closestPointOnSegment(s.ax, s.az, s.bx, s.bz, b.pos.x, b.pos.y);
      let nx = b.pos.x - c.x, nz = b.pos.y - c.z;
      const minDist = s.radius + b.radius, distSq = nx * nx + nz * nz;
      if (distSq >= minDist * minDist || distSq === 0) continue;
      const dist = Math.sqrt(distSq);
      nx /= dist; nz /= dist;
      b.pos.x += nx * (minDist - dist);
      b.pos.y += nz * (minDist - dist);
      const approach = b.vel.x * nx + b.vel.y * nz;
      if (approach >= 0) continue;
      b.vel.x -= nx * approach * (1 + SEGMENT_RESTITUTION);
      b.vel.y -= nz * approach * (1 + SEGMENT_RESTITUTION);
      const impulse = -approach * (1 + SEGMENT_RESTITUTION) * b.mass;
      if (engine.onImpact && impulse > MIN_EVENT_IMPULSE) {
        s.pos.set(c.x, c.z);
        engine.onImpact(s, b, impulse, c.x, c.z);
      }
    }
  }
}
