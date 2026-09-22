// How the AI reads the departing lorries. The shot planner already aims at the
// goal's current mouth (physics.goalCenters); this adds what rehearsal can't
// see: where each lorry will be NEXT.
//   · leave the ball close to their goal's next stop (a setup)
//   · keep a cap on your own goal's next stop, and don't leave the ball near it
// `defend: false` (solo challenges) drops the defensive terms.
import { attackDirection, otherSide, GOAL_LINE_X } from '../core/pitch-dimensions-and-constants.js';

const DEFAULT_TACTICS = { block: 1, setup: 1, caution: 1 };

export function lorryCandidatePoints(lorries, side, { defend = true } = {}) {
  if (!defend) return { ballTargets: [], blockPoints: [] };
  const own = lorries.goalDefendedBy(side);
  // Slide a cap across to where our goal is going, just in front of the line.
  return { ballTargets: [], blockPoints: [{ x: own.sign * (GOAL_LINE_X - 0.16), z: lorries.center(own, 1) }] };
}

export function scoreLorryOutcome(sim, side, ballIndex, lorries, tactics = DEFAULT_TACTICS, { defend = true } = {}) {
  const t = { ...DEFAULT_TACTICS, ...tactics };
  const dir = attackDirection(side);
  const ball = sim.bodies[ballIndex].pos;
  const theirs = lorries.goalDefendedBy(otherSide(side));
  // Their goal moves when our next turn starts: reward being close to where it will be.
  const toNext = Math.hypot(ball.x - dir * GOAL_LINE_X, ball.y - lorries.center(theirs, 1));
  let score = Math.max(0, 1 - toNext) * 70 * t.setup;
  if (defend) {
    const own = lorries.goalDefendedBy(side);
    const nextZ = lorries.center(own, 1);
    const toOwnNext = Math.hypot(ball.x + dir * GOAL_LINE_X, ball.y - nextZ);
    if (toOwnNext < 0.9) score -= (0.9 - toOwnNext) * 100 * t.caution;
    for (const b of sim.bodies) {
      if (b.kind === 'cap' && b.side === side && Math.abs(b.pos.x + dir * GOAL_LINE_X) < 0.3
        && Math.abs(b.pos.y - nextZ) < 0.2) score += 40 * t.block;
    }
  }
  return score;
}
