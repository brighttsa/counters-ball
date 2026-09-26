// Daily Flick: one puzzle table a day, the same for every player (numbered from launch day, UTC), built on
// the six classic tables. The ball waits in the attacking half, a defender stands in the straight line to
// goal and the keeper guards the line; you have two caps up front and five flicks. Score in as few flicks
// as you can: par is the target to beat. Placement is seeded by the day number, so everyone gets the same shot.
import { CAMPAIGN_LEVELS } from './campaign-level-definitions.js';
import { createSeededRandom } from '../core/seeded-random-number-generator.js';
import { GOAL_LINE_X, PITCH_HALF_WIDTH } from '../core/pitch-dimensions-and-constants.js';

const DAILY_EPOCH = Date.UTC(2026, 8, 26); // Daily Flick #1
const DAY_MS = 86_400_000;
export const DAILY_FLICK_LIMIT = 5;

/** Today's puzzle number (1 on launch day). */
export const dailyNumber = (now = Date.now()) => Math.max(1, Math.floor((now - DAILY_EPOCH) / DAY_MS) + 1);

const clampZ = (z) => Math.max(-PITCH_HALF_WIDTH + 0.12, Math.min(PITCH_HALF_WIDTH - 0.12, z));

export function dailyFlickPuzzle(number) {
  const rng = createSeededRandom(number * 7919 + 17);
  const base = CAMPAIGN_LEVELS[(number - 1) % CAMPAIGN_LEVELS.length];
  const ball = [0.35 + rng() * 0.5, clampZ((rng() - 0.5) * 1.3)];
  const toGoal = Math.atan2(-ball[1], GOAL_LINE_X - ball[0]);
  // Your striker sits behind the ball but off the straight line, so the first flick is a choice, not a tap-in.
  const offset = (rng() < 0.5 ? -1 : 1) * (0.35 + rng() * 0.5);
  const striker = [ball[0] - Math.cos(toGoal + offset) * 0.32, clampZ(ball[1] - Math.sin(toGoal + offset) * 0.32)];
  const support = [-0.1 + rng() * 0.35, clampZ((rng() - 0.5) * 1.4)];
  // The defender blocks the straight path about halfway to goal; the keeper shades toward the ball.
  const t = 0.4 + rng() * 0.15;
  const defender = [ball[0] + (GOAL_LINE_X - ball[0]) * t, clampZ(ball[1] * (1 - t) + (rng() - 0.5) * 0.12)];
  const keeper = [1.32, clampZ(ball[1] * 0.25)];
  const par = ball[0] > 0.65 && Math.abs(ball[1]) < 0.45 ? 1 : 2;
  const level = {
    ...base,
    id: `daily-${number}`,
    daily: number,
    tutorial: false,
    obstacles: [], // a clear table: the puzzle is the caps, not the props
    blurb: `Score in ${DAILY_FLICK_LIMIT} flicks or fewer. Par ${par}.`,
    rules: { goalsToWin: 1, flickLimit: DAILY_FLICK_LIMIT, awayFlickLimit: 0, threeStarFlicks: par },
    awaySlots: [0, 1],
  };
  return { number, level, par, setup: { ball, home: [[-1.32, 0], striker, support], away: [keeper, defender] } };
}
