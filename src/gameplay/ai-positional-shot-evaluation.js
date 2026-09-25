// Reward a playable next touch, not territory with every cap stranded beyond the ball.
// Bounded well below goal and own-goal values; the same physics applies at every difficulty.
import { attackDirection, WALL_HALF_LENGTH, WALL_HALF_WIDTH } from '../core/pitch-dimensions-and-constants.js';

export function supportPointBehindBall(ball, side) {
  const clamp = (v, limit) => Math.max(-limit, Math.min(limit, v));
  return { x: clamp(ball.pos.x - attackDirection(side) * 0.32, WALL_HALF_LENGTH - 0.12),
    z: clamp(ball.pos.y, WALL_HALF_WIDTH - 0.12) };
}

export function scoreShotAccess(sim, side, ballIndex) {
  const ball = sim.bodies[ballIndex];
  const dir = attackDirection(side);
  let best = 0;
  for (const cap of sim.bodies) {
    if (cap.kind !== 'cap' || cap.side !== side) continue;
    const dx = (ball.pos.x - cap.pos.x) * dir;
    const dz = ball.pos.y - cap.pos.y;
    const distance = Math.hypot(dx, dz);
    if (dx <= 0 || distance < 1e-6 || distance > 0.9) continue;
    const alignment = dx / distance;
    best = Math.max(best, 40 * alignment * (1 - distance / 0.9));
  }
  return best; // one usable cap is enough; no reward for piling the team onto the ball
}
