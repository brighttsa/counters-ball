// Swept goal test for the ball, plus an optional bank rule.
//
// Where did the ball cross the goal plane this step, and was it inside the
// mouth (which may sit off-centre on moving-goal venues)? If the venue sets
// `engine.goalRequiresTouchOf` (kinds, e.g. ['pot', 'rail']), a goal only counts
// when the ball hit one of them since the flick began (`ball.bankedOff`);
// 'rail' means the table's batten walls;
// otherwise `onGoalDenied` fires and play simply continues. The AI rehearses
// on clones that carry the same rule, so it never plans a goal that won't count.
import { GOAL_LINE_X, GOAL_HALF_WIDTH } from '../core/pitch-dimensions-and-constants.js';

const GOAL_DEPTH = GOAL_LINE_X + 0.03; // counts a little past the chalk so dying shots don't score

export function checkGoalCrossing(engine, b) {
  if (engine.goalCooldown || b.kind !== 'ball') return;
  if (!(Math.abs(b.pos.x) > GOAL_DEPTH && Math.abs(b.prev.x) <= GOAL_DEPTH)) return;
  const sign = Math.sign(b.pos.x);
  const t = (sign * GOAL_DEPTH - b.prev.x) / (b.pos.x - b.prev.x);
  const zAtCrossing = b.prev.y + (b.pos.y - b.prev.y) * t;
  if (Math.abs(zAtCrossing - engine.goalCenters[sign]) >= GOAL_HALF_WIDTH - b.radius) return;
  if (engine.goalRequiresTouchOf && !b.bankedOff) {
    engine.onGoalDenied?.(sign);
    return;
  }
  engine.goalCooldown = true;
  engine.onGoalScored?.(sign);
}

/** Collision bookkeeping for the bank rule: remember the ball hit a required kind. */
export function noteBankTouch(engine, a, b) {
  const kinds = engine.goalRequiresTouchOf;
  if (!kinds) return;
  if (a.kind === 'ball' && kinds.includes(b.kind)) a.bankedOff = true;
  else if (b.kind === 'ball' && kinds.includes(a.kind)) b.bankedOff = true;
}

/** The ball bounced off a batten wall: a rail bank, if the venue counts those. */
export function noteRailBank(engine, b) {
  if (b.kind === 'ball' && engine.goalRequiresTouchOf?.includes('rail')) b.bankedOff = true;
}

/** A new flick (or a new AI rehearsal) starts with no bank touches. */
export function clearBankTouches(engine) {
  for (const b of engine.bodies) if (b.kind === 'ball') b.bankedOff = false;
}
