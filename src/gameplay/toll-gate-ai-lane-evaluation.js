// How the AI reads the toll plazas. It rehearses shots on a cloned table whose
// booms are exactly as they are now (they never move mid-flick), so open and
// closed lanes, bank shots off a lowered boom and jams are simulated for free.
// This module adds what simulation alone can't see: the NEXT signal.
//   · lanes open for the opponent on their turn: block the one the ball faces
//   · lanes open for us on our next turn: leave the ball lined up with one
// Tendencies come from the rival's `tactics` weights: same physics, same rules.
// `defend: false` (solo challenges) drops the defensive terms — nobody attacks.
import { attackDirection, otherSide } from '../core/pitch-dimensions-and-constants.js';
import { LANES } from './toll-gate-lane-signal-state.js';

const DEFAULT_TACTICS = { block: 1, setup: 1, caution: 1 };

/** The lane among `lanes` whose centre is nearest `z`. */
const nearestLane = (lanes, z) => lanes.reduce((best, lane) =>
  (Math.abs(LANES[lane].center - z) < Math.abs(LANES[best].center - z) ? lane : best), lanes[0]);

/** Extra aim points for the ball (through open lanes) and cap-only moves (blocking). */
export function tollGateCandidatePoints(gates, side, ballZ = 0, { defend = true } = {}) {
  const attack = gates.plazaDefendedBy(otherSide(side));
  const own = gates.plazaDefendedBy(side);
  const ballTargets = [0, 1, 2].filter((lane) => gates.isOpen(attack, lane))
    .map((lane) => ({ x: attack.x, z: LANES[lane].center }));
  if (!defend) return { ballTargets, blockPoints: [] };
  // Park just on the attacker's side of our boom line, in the open lane the ball faces.
  const threat = nearestLane(gates.openNext(own), ballZ);
  return { ballTargets, blockPoints: [{ x: own.x + attackDirection(side) * 0.11, z: LANES[threat].center }] };
}

/** Score adjustment for a rehearsed outcome that did not produce a goal. */
export function scoreTollGateOutcome(sim, side, ballIndex, gates, tactics = DEFAULT_TACTICS, { defend = true } = {}) {
  const t = { ...DEFAULT_TACTICS, ...tactics };
  const dir = attackDirection(side);
  const ball = sim.bodies[ballIndex].pos;
  const own = gates.plazaDefendedBy(side);
  const attack = gates.plazaDefendedBy(otherSide(side));
  let score = 0;

  if (defend) {
    const threat = LANES[nearestLane(gates.openNext(own), ball.y)];
    // A cap parked in the open lane the ball faces: a toll collector's block.
    for (const b of sim.bodies) {
      if (b.kind !== 'cap' || b.side !== side) continue;
      if (Math.abs(b.pos.y - threat.center) < threat.half && Math.abs(b.pos.x - own.x) < 0.2) score += 45 * t.block;
    }
    // Ball left in front of our plaza, lined up with a lane that will be open for them.
    const inFrontOfOwn = (ball.x - own.x) * dir > 0 && (ball.x - own.x) * dir < 0.75;
    if (inFrontOfOwn && Math.abs(ball.y - threat.center) < threat.half) score -= 40 * t.caution;
  }

  // Ball on the approach to their plaza, lined up with a lane open on our next turn: a setup.
  const approaching = (attack.x - ball.x) * dir > 0.05 && (attack.x - ball.x) * dir < 0.8;
  const next = LANES[nearestLane(gates.openNext(attack), ball.y)];
  const offset = Math.abs(ball.y - next.center);
  if (approaching && offset < next.half) score += 40 * t.setup * (1 - offset / next.half);
  // No bonus for merely pushing the ball past their plaza: playtests showed it
  // parks the ball beside the back caps instead of somewhere finishable.
  return score;
}
