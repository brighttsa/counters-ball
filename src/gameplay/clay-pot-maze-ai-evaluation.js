// How the AI reads Auntie Ama's pots. Its rehearsal clones carry the bank rule
// (`goalRequiresTouchOf`), so only banked goals score in simulation; this adds
// aims that make banks likely and a sense of where banks come from:
//   · ghost-ball aims onto each pot in front of their goal, angled into the mouth
//   · reward leaving the ball where a pot can turn it into their goal (a setup)
//   · penalise leaving it where a pot can turn it into ours (caution)
// `defend: false` (solo challenges) drops the defensive term.
import { attackDirection, otherSide, GOAL_LINE_X } from '../core/pitch-dimensions-and-constants.js';
import { POT_RADIUS } from './clay-pot-maze-state.js';

const DEFAULT_TACTICS = { block: 1, setup: 1, caution: 1 };
const BALL_RADIUS = 0.035;

const unit = (x, z) => { const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l }; };

/** Point the ball must reach so a pot sends it toward `goal` (the bisector contact). */
function bankPoint(pot, ball, goal) {
  const toBall = unit(ball.x - pot.pos.x, ball.y - pot.pos.y);
  const toGoal = unit(goal.x - pot.pos.x, goal.z - pot.pos.y);
  const n = unit(toBall.x + toGoal.x, toBall.z + toGoal.z);
  return { x: pot.pos.x + n.x * (POT_RADIUS + BALL_RADIUS), z: pot.pos.y + n.z * (POT_RADIUS + BALL_RADIUS) };
}

/** Can a pot plausibly bank the ball from here into that goal (angle and distance)? */
function bankable(pots, ball, goal) {
  return pots.some((pot) => {
    const a = unit(ball.x - pot.pos.x, ball.y - pot.pos.y), g = unit(goal.x - pot.pos.x, goal.z - pot.pos.y);
    const cos = a.x * g.x + a.z * g.z;
    return Math.hypot(ball.x - pot.pos.x, ball.y - pot.pos.y) < 0.8 && cos > -0.6 && cos < 0.65;
  });
}

export function potCandidatePoints(maze, side, ball) {
  const goal = { x: attackDirection(side) * GOAL_LINE_X, z: 0 };
  return { ballTargets: maze.potsFacing(side).map((pot) => bankPoint(pot, ball, goal)), blockPoints: [] };
}

export function scorePotOutcome(sim, side, ballIndex, maze, tactics = DEFAULT_TACTICS, { defend = true } = {}) {
  const t = { ...DEFAULT_TACTICS, ...tactics };
  const dir = attackDirection(side);
  const ball = sim.bodies[ballIndex].pos;
  let score = 0;
  if (bankable(maze.potsFacing(side), ball, { x: dir * GOAL_LINE_X, z: 0 })) score += 40 * t.setup;
  // Pots in front of our goal are the ones the opponent attacks.
  if (defend && bankable(maze.potsFacing(otherSide(side)), ball, { x: -dir * GOAL_LINE_X, z: 0 })) score -= 40 * t.caution;
  return score;
}
