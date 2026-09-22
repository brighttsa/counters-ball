// Pure 2D segment geometry (no Three.js), shared by physics, venue state and AI.
const closest = { x: 0, z: 0 };

/** Closest point on segment a→b to point p (written into `closest`). */
export function closestPointOnSegment(ax, az, bx, bz, px, pz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
  closest.x = ax + dx * t;
  closest.z = az + dz * t;
  return closest;
}

/** Does the straight line p→q pass within `margin` of the segment? (AI line-of-sight.) */
export function lineBlockedBySegment(px, pz, qx, qz, s, margin = 0) {
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const x = px + ((qx - px) * i) / steps, z = pz + ((qz - pz) * i) / steps;
    const c = closestPointOnSegment(s.ax, s.az, s.bx, s.bz, x, z);
    if (Math.hypot(x - c.x, z - c.z) < s.radius + margin) return true;
  }
  return false;
}

/**
 * Move a resting body out of a segment it overlaps, on the side it already sits
 * (or along the fallback normal if it is exactly on the line). Used when a venue
 * piece turns between turns and sweeps things aside. Returns true if moved.
 */
export function pushClearOfSegment(s, body, fallbackNx, fallbackNz) {
  const c = closestPointOnSegment(s.ax, s.az, s.bx, s.bz, body.pos.x, body.pos.y);
  let nx = body.pos.x - c.x, nz = body.pos.y - c.z;
  const d = Math.hypot(nx, nz), reach = body.radius + s.radius;
  if (d >= reach) return false;
  if (d < 1e-6) { nx = fallbackNx; nz = fallbackNz; } else { nx /= d; nz /= d; }
  body.pos.x = c.x + nx * reach;
  body.pos.y = c.z + nz * reach;
  if (body.prev) { body.prev.x = body.pos.x; body.prev.y = body.pos.y; }
  return true;
}
