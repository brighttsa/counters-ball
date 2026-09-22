// How the AI reads the coin-stack chains. Its rehearsal clones carry the
// padlock bars (segments) and the stacks (static targets that remember who
// struck them), so a locked goal never scores in simulation. This adds:
//   · aims at the beam stack: the ball sent into it, or a cap flicked straight at it
//   · a reward for lighting it (more for two in one flick)
//   · Magic's habit: leave the ball near the stack after next ("two turns ahead"),
//     or in front of their goal once the chain is about to open
//   · caution: don't leave the ball beside the opponent's beam stack
// `defend: false` (solo challenges) drops the defensive term.
import { attackDirection, otherSide, GOAL_LINE_X } from '../core/pitch-dimensions-and-constants.js';
import { targetStruckFor } from './goal-line-crossing-detection.js';

const DEFAULT_TACTICS = { block: 1, setup: 1, caution: 1 };
const LIGHT_REWARD = 320;
const SETUP_REACH = 0.9;

export function chainCandidatePoints(chains, side) {
  const next = chains.nextStack(side);
  if (!next) return { ballTargets: [], blockPoints: [] }; // goal open: the planner's own goal aims take over
  const point = { x: next.pos.x, z: next.pos.y };
  // blockPoints are direct cap flicks at a point: here, a cap straight into the stack.
  return { ballTargets: [point], blockPoints: [point] };
}

/** Index of a body in the rehearsal clone (body order is preserved by cloning). */
const simBody = (sim, chains, body) => sim.bodies[chains.physics.bodies.indexOf(body)];

export function scoreChainOutcome(sim, side, ballIndex, chains, tactics = DEFAULT_TACTICS, { defend = true } = {}) {
  const t = { ...DEFAULT_TACTICS, ...tactics };
  const ball = sim.bodies[ballIndex].pos;
  let score = 0;
  let lit = 0;
  for (let ahead = 0; ahead < 2; ahead++) {
    const stack = chains.nextStack(side, ahead);
    if (!stack || !targetStruckFor(simBody(sim, chains, stack), side)) break;
    lit += 1;
  }
  score += lit * LIGHT_REWARD;
  // Where will the beam be next turn? Leave the ball within reach of it.
  // Once the chain has been lit on this flick, set up the shot instead.
  const upcoming = chains.nextStack(side, lit);
  if (upcoming || lit) {
    const tx = upcoming ? upcoming.pos.x : attackDirection(side) * GOAL_LINE_X, tz = upcoming ? upcoming.pos.y : 0;
    const d = Math.hypot(ball.x - tx, ball.y - tz);
    if (d < SETUP_REACH) score += (SETUP_REACH - d) * 70 * t.setup;
  }
  if (defend) {
    const theirs = chains.nextStack(otherSide(side));
    if (theirs) {
      const d = Math.hypot(ball.x - theirs.pos.x, ball.y - theirs.pos.y);
      if (d < 0.5) score -= (0.5 - d) * 90 * t.caution;
    }
  }
  return score;
}
