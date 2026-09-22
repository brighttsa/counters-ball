// How the AI reads the schoolyard rulers. Rehearsal on the cloned table
// already bounces shots off the ruler as it stands (segments are cloned).
// This adds a bank aim and the ruler's NEXT angle:
//   · aim the ball at the goal's mirror image across the ruler: a bank shot
//   · leave the ball with a clear line past their ruler's next angle (a setup)
//   · don't leave the ball with a clear line past our ruler's next angle (caution)
// `defend: false` (solo challenges) drops the defensive term.
import { attackDirection, otherSide, GOAL_LINE_X } from '../core/pitch-dimensions-and-constants.js';
import { lineBlockedBySegment } from './segment-geometry-helpers.js';
import { RULER_THICKNESS } from './ruler-seesaw-state.js';

const DEFAULT_TACTICS = { block: 1, setup: 1, caution: 1 };
const BALL_MARGIN = 0.035;

/** Reflect point p across the infinite line through the segment. */
function mirrorAcross(s, px, pz) {
  const dx = s.bx - s.ax, dz = s.bz - s.az, len2 = dx * dx + dz * dz || 1;
  const t = ((px - s.ax) * dx + (pz - s.az) * dz) / len2;
  const fx = s.ax + dx * t, fz = s.az + dz * t;
  return { x: 2 * fx - px, z: 2 * fz - pz };
}

export function rulerCandidatePoints(rulers, side) {
  const theirs = rulers.rulerDefendedBy(otherSide(side));
  const goal = { x: attackDirection(side) * GOAL_LINE_X, z: 0 };
  return { ballTargets: [mirrorAcross(theirs.segment, goal.x, goal.z)], blockPoints: [] };
}

export function scoreRulerOutcome(sim, side, ballIndex, rulers, tactics = DEFAULT_TACTICS, { defend = true } = {}) {
  const t = { ...DEFAULT_TACTICS, ...tactics };
  const dir = attackDirection(side);
  const ball = sim.bodies[ballIndex].pos;
  const segmentAt = (ruler) => ({ ...rulers.endpoints(ruler, rulers.angle(ruler, 1)), radius: RULER_THICKNESS });
  let score = 0;
  // Their ruler turns when our next turn starts: is the line to goal clear then?
  const theirNext = segmentAt(rulers.rulerDefendedBy(otherSide(side)));
  const toGoal = Math.hypot(dir * GOAL_LINE_X - ball.x, ball.y);
  if (toGoal < 1.2 && !lineBlockedBySegment(ball.x, ball.y, dir * GOAL_LINE_X, 0, theirNext, BALL_MARGIN)) {
    score += (1.2 - toGoal) * 60 * t.setup;
  }
  if (defend) {
    const ownNext = segmentAt(rulers.rulerDefendedBy(side));
    const toOwn = Math.hypot(-dir * GOAL_LINE_X - ball.x, ball.y);
    if (toOwn < 1.2 && !lineBlockedBySegment(ball.x, ball.y, -dir * GOAL_LINE_X, 0, ownNext, BALL_MARGIN)) {
      score -= (1.2 - toOwn) * 60 * t.caution;
    }
  }
  return score;
}
