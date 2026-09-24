// Pure table geometry behind the in-match chalk hints: is the straight line from the ball to the goal
// blocked, is there a clean one-rail bank instead, and is one of the player's caps hidden behind another
// piece from where the camera stands. Table coordinates: x along the pitch, y (Vector2) = world z.
import { closestPointOnSegment, lineBlockedBySegment } from './segment-geometry-helpers.js';
import { BALL_RADIUS, GOAL_LINE_X, WALL_HALF_WIDTH } from '../core/pitch-dimensions-and-constants.js';

/** Does the ball's path a→b stay clear of every piece, prop and standing segment (except `ignore`)? */
export function pathClear(a, b, physics, ignore = []) {
  for (const body of physics.bodies) {
    if (body.kind === 'ball' || body.kind === 'post' || ignore.includes(body)) continue;
    const c = closestPointOnSegment(a.x, a.y, b.x, b.y, body.pos.x, body.pos.y);
    if (Math.hypot(body.pos.x - c.x, body.pos.y - c.z) < body.radius + BALL_RADIUS) return false;
  }
  for (const segment of physics.segments ?? []) {
    if (!segment.disabled && lineBlockedBySegment(a.x, a.y, b.x, b.y, segment, BALL_RADIUS)) return false;
  }
  return true;
}

/** Centre of the goal mouth `side` attacks. */
export function attackedGoal(physics, side) {
  const sign = side === 'away' ? -1 : 1;
  return { x: sign * GOAL_LINE_X, y: physics.goalCenters?.[sign] ?? 0 };
}

/**
 * When the straight ball-to-goal line is blocked, the shortest one-rail bank that reaches the goal
 * cleanly: mirror the goal across a side rail, aim the ball at the mirror image, and the crossing with
 * the rail is the bank point. Null when the straight line is open or no clean bank exists.
 */
export function findRailBank(physics, ball, side) {
  const goal = attackedGoal(physics, side);
  if (pathClear(ball, goal, physics)) return null;
  let best = null;
  for (const rail of [WALL_HALF_WIDTH - BALL_RADIUS, -(WALL_HALF_WIDTH - BALL_RADIUS)]) {
    const mirrorY = 2 * rail - goal.y;
    const t = (rail - ball.y) / (mirrorY - ball.y);
    if (!(t > 0 && t < 1)) continue;
    const bank = { x: ball.x + (goal.x - ball.x) * t, y: rail };
    if (Math.abs(bank.x) > GOAL_LINE_X - .1) continue; // too close to the end to read as a bank
    if (!pathClear(ball, bank, physics) || !pathClear(bank, goal, physics)) continue;
    const length = Math.hypot(bank.x - ball.x, bank.y - ball.y) + Math.hypot(goal.x - bank.x, goal.y - bank.y);
    if (!best || length < best.length) best = { ball: { x: ball.x, y: ball.y }, bank, goal, length };
  }
  return best;
}

/**
 * Is `body` (one of the player's caps) hidden from the camera by another piece or prop standing
 * between them? Pieces are treated as spheres of their radius at their height above the table.
 * `camera` is {x, y, z} in world space.
 */
export function hiddenFromCamera(camera, body, physics, height = .02) {
  const target = { x: body.pos.x, y: height, z: body.pos.y };
  const dx = target.x - camera.x, dy = target.y - camera.y, dz = target.z - camera.z;
  const length = Math.hypot(dx, dy, dz);
  for (const other of physics.bodies) {
    if (other === body || other.kind === 'post') continue;
    const ox = other.pos.x - camera.x, oy = height - camera.y, oz = other.pos.y - camera.z;
    const along = (ox * dx + oy * dy + oz * dz) / length;
    if (along <= 0 || along >= length - body.radius) continue; // behind the camera or behind the cap
    const off = Math.hypot(ox - dx * along / length, oy - dy * along / length, oz - dz * along / length);
    if (off < other.radius * .9) return true;
  }
  return false;
}
