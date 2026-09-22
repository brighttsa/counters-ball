// How the AI reads the kiosk change dishes. Rehearsal on the cloned table
// already rattles shots off the dish as it stands (its pieces are segments).
// This adds an aim into the open window and the dish's NEXT notch:
//   · aim the ball into the middle of the open window (a threading shot)
//   · leave the ball with a clear line into their goal past the dish's next notch
//   · don't leave a clear line into ours past our dish's next notch (caution)
// `defend: false` (solo challenges) drops the defensive term.
import { attackDirection, otherSide, GOAL_LINE_X } from '../core/pitch-dimensions-and-constants.js';
import { lineBlockedBySegment } from './segment-geometry-helpers.js';
import { COVER_ANGLES, DISH_SPAN, DISH_RADIUS } from './change-dish-state.js';

const DEFAULT_TACTICS = { block: 1, setup: 1, caution: 1 };
const BALL_MARGIN = 0.035;
const WINDOW_DEPTH = 0.2; // aim point just inside the rim, in the open window

/** Relative angles (0 = straight out of the goal) at the middle of each open window. */
function openWindowCentres(cover) {
  const lo = cover - DISH_SPAN / 2, hi = cover + DISH_SPAN / 2, edge = Math.PI / 2;
  return [[-edge, lo], [hi, edge]].filter(([a, b]) => b - a > 0.2).map(([a, b]) => (a + b) / 2);
}

export function dishCandidatePoints(dishes, side) {
  const theirs = dishes.dishDefendedBy(otherSide(side));
  const cx = theirs.sign * GOAL_LINE_X;
  const ballTargets = openWindowCentres(COVER_ANGLES[dishes.state(theirs)]).map((phi) => {
    const a = dishes.worldAngle(theirs, phi);
    return { x: cx + Math.cos(a) * WINDOW_DEPTH, z: Math.sin(a) * WINDOW_DEPTH };
  });
  return { ballTargets, blockPoints: [] };
}

/** Is the straight line from the ball into the goal mouth clear of a dish at notch `ahead`? */
function clearShot(dishes, dish, ball, ahead) {
  const pieces = dishes.pieces(dish, COVER_ANGLES[dishes.state(dish, ahead)]);
  const gx = dish.sign * GOAL_LINE_X;
  return [-0.15, 0, 0.15].some((gz) => pieces.every((p) => !lineBlockedBySegment(ball.x, ball.y, gx, gz, p, BALL_MARGIN)));
}

export function scoreDishOutcome(sim, side, ballIndex, dishes, tactics = DEFAULT_TACTICS, { defend = true } = {}) {
  const t = { ...DEFAULT_TACTICS, ...tactics };
  const dir = attackDirection(side);
  const ball = sim.bodies[ballIndex].pos;
  let score = 0;
  const toGoal = Math.hypot(dir * GOAL_LINE_X - ball.x, ball.y);
  if (toGoal < 1.2 && toGoal > DISH_RADIUS && clearShot(dishes, dishes.dishDefendedBy(otherSide(side)), ball, 1)) {
    score += (1.2 - toGoal) * 60 * t.setup;
  }
  if (defend) {
    const toOwn = Math.hypot(-dir * GOAL_LINE_X - ball.x, ball.y);
    if (toOwn < 1.2 && toOwn > DISH_RADIUS && clearShot(dishes, dishes.dishDefendedBy(side), ball, 1)) {
      score -= (1.2 - toOwn) * 60 * t.caution;
    }
  }
  return score;
}
