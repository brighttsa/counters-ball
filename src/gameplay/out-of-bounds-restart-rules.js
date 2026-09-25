import { GOAL_LINE_X, WALL_HALF_LENGTH, WALL_HALF_WIDTH, SIDE_HOME, SIDE_AWAY } from '../core/pitch-dimensions-and-constants.js';

// Rails remain playable banks. This only classifies a genuine escape beyond the physical rim.
export function classifyOutOfBounds(ball) {
  if (Math.abs(ball.pos.y) <= WALL_HALF_WIDTH + ball.radius && Math.abs(ball.pos.x) <= WALL_HALF_LENGTH + ball.radius) return null;
  const end = Math.abs(ball.pos.x) > GOAL_LINE_X ? Math.sign(ball.pos.x) : 0;
  if (end) return { type: end === 1 ? 'goal-kick' : 'corner', side: end === 1 ? SIDE_AWAY : SIDE_HOME };
  return { type: 'sideline', side: ball.pos.y > 0 ? SIDE_HOME : SIDE_AWAY };
}

export function restartPoint(restart) {
  if (restart.type === 'goal-kick') return { x: -0.92, z: 0 };
  if (restart.type === 'corner') return { x: 0.92, z: 0 };
  return { x: 0, z: restart.side === SIDE_HOME ? 0.72 : -0.72 };
}
