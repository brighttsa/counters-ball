import { MAX_PULL, MAX_FLICK_SPEED, WALL_HALF_LENGTH, WALL_HALF_WIDTH } from '../core/pitch-dimensions-and-constants.js';

// A margin on continuous stopping distance avoids promising boost-dependent hits.
export function conservativeFlickRange(body, power) {
  const speed = Math.max(0, Math.min(1, power)) * MAX_FLICK_SPEED;
  const damping = Math.max(0, body.linearDamping ?? 1.7);
  const friction = Math.max(0, body.constantFriction ?? 0.32);
  const distance = damping > 0
    ? (friction > 0 ? speed / damping - friction / damping ** 2 * Math.log1p(damping * speed / friction) : speed / damping)
    : (friction > 0 ? speed ** 2 / (2 * friction) : 3);
  return Math.min(3, distance * 0.9);
}

/** Pure swept-circle query; position is the selected cap center at contact. */
export function firstFlickContact(body, direction, maxDistance, bodies = [], walls = { x: WALL_HALF_LENGTH, y: WALL_HALF_WIDTH }) {
  const length = Math.hypot(direction.x, direction.y);
  if (!(length > 0) || !(maxDistance > 0)) return null;
  const dx = direction.x / length, dy = direction.y / length;
  let hit = null;
  const accept = (distance, target, nx, ny, kind) => {
    if (distance < -1e-9 || distance > maxDistance || (hit && distance >= hit.distance)) return;
    distance = Math.max(0, distance);
    hit = { distance, target, kind, position: { x: body.pos.x + dx * distance, y: body.pos.y + dy * distance },
      normal: { x: nx, y: ny }, alignment: Math.max(0, -(dx * nx + dy * ny)) };
  };
  for (const target of bodies) {
    if (target === body) continue;
    const x = body.pos.x - target.pos.x, y = body.pos.y - target.pos.y;
    const radius = body.radius + target.radius;
    const c = x * x + y * y - radius * radius, along = x * dx + y * dy;
    if (c >= -1e-10 && along >= 0) continue;
    const discriminant = along * along - c;
    if (c > 1e-10 && (along >= 0 || discriminant < -1e-10)) continue;
    const distance = c <= 1e-10 ? 0 : -along - Math.sqrt(Math.max(0, discriminant));
    const nx = x + dx * distance, ny = y + dy * distance, n = Math.hypot(nx, ny);
    accept(distance, target, n ? nx / n : -dx, n ? ny / n : -dy, target.kind);
  }
  if (walls) for (const [axis, component] of [['x', dx], ['y', dy]]) {
    const limit = walls[axis] - body.radius;
    if (Math.abs(body.pos[axis]) >= limit && body.pos[axis] * component > 0) {
      const sign = Math.sign(body.pos[axis]) || 1;
      accept(0, null, axis === 'x' ? -sign : 0, axis === 'y' ? -sign : 0, 'wall');
    } else if (Math.abs(component) > 1e-12) {
      const sign = Math.sign(component);
      accept((sign * limit - body.pos[axis]) / component, null,
        axis === 'x' ? -sign : 0, axis === 'y' ? -sign : 0, 'wall');
    }
  }
  return hit;
}

export function flickPreview(body, pull, bodies = []) {
  const length = Math.hypot(pull.x, pull.y);
  const power = Math.min(1, length / MAX_PULL);
  const direction = length ? { x: pull.x / length, y: pull.y / length } : { x: 0, y: 0 };
  const range = conservativeFlickRange(body, power);
  return { power, direction, range, contact: firstFlickContact(body, direction, range, bodies) };
}
