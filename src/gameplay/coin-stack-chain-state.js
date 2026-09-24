// Lights Out Final, Jamestown: Magic's coin-stack chain. Pure game state.
//
// Each goal is padlocked: an iron bar across the mouth that stops the ball.
// Each side has its own chain of three coin stacks in the half it attacks. The
// lighthouse beam picks out the next stack; strike it (with the ball, or with
// one of your own caps, on your own flick) and it lights, and the beam moves on.
// Light all three and the padlock drops: LIGHTS ON, that goal is open. Strike
// the last stack and score on the same flick for the hero goal. After every
// goal the scorer's bulb goes out again: relight the chain to score again.
import { attackDirection, GOAL_LINE_X, GOAL_HALF_WIDTH } from '../core/pitch-dimensions-and-constants.js';
import { targetStruckFor } from './goal-line-crossing-detection.js';

export const STACK_RADIUS = 0.06;
export const LOCK_BAR_X = GOAL_LINE_X + 0.012; // just behind the chalk, between the posts
const LOCK_BAR_RADIUS = 0.012;
// Home's chain (home attacks +x), in beam order: midfield, the far flank, then
// off the goal's shoulder. Magic's chain is the same turned through the centre spot.
export const HOME_CHAIN = [[0.25, -0.45], [0.7, 0.45], [1.12, -0.28]];
const SIDES = ['home', 'away'];

export class CoinStackChains {
  constructor() {
    this.stacks = { home: [], away: [] };
    this.bars = {};
    this.lit = { home: 0, away: 0 };
    this.flight = null;
    this.relock = new Set();
  }

  /** Stacks (static targets) and the two padlock bars go into the physics engine. */
  attach(physics) {
    this.physics = physics;
    for (const side of SIDES) {
      const sign = attackDirection(side);
      for (const [x, z] of HOME_CHAIN) {
        const body = physics.addStaticCircle({ x: sign * x, z: sign * z, radius: STACK_RADIUS, kind: 'coins' });
        Object.assign(body, { target: true, hitBall: false, hitCaps: 0, owner: side });
        this.stacks[side].push(body);
      }
      // The bar on the goal this side attacks: it opens when this side's chain is lit.
      this.bars[side] = physics.addStaticSegment({ ax: sign * LOCK_BAR_X, az: -GOAL_HALF_WIDTH, bx: sign * LOCK_BAR_X,
        bz: GOAL_HALF_WIDTH, radius: LOCK_BAR_RADIUS, kind: 'padlock' });
    }
  }

  isOpen(side) { return this.lit[side] >= 3; }

  /** The stack the beam is on for `side`, or null once their goal is open. */
  nextStack(side, ahead = 0) { return this.stacks[side][this.lit[side] + ahead] ?? null; }

  /** Start of a turn: a goal scored since the last turn put that scorer's bulb out. */
  advance() {
    const callouts = [];
    for (const side of this.relock) {
      this.lit[side] = 0;
      this.bars[side].disabled = false;
      callouts.push('LIGHTS OUT');
    }
    this.relock.clear();
    return callouts;
  }

  beginFlick(side) {
    this.flight = { side, lit: 0, unlocked: false, coins: false };
    this.physics?.clearBankTouches();
  }

  /**
   * A real impact during play. Lights the flicker's beam stack if the ball or
   * one of their caps struck it; returns the callout labels to show (maybe none).
   */
  noteImpact(a, b) {
    if (!this.flight) return [];
    const stack = a.target ? a : b.target ? b : null;
    if (!stack) return [];
    const striker = stack === a ? b : a;
    if (striker.kind === 'ball') this.flight.coins = true;
    const side = this.flight.side;
    if (stack !== this.nextStack(side) || !targetStruckFor(stack, side)) return [];
    this.lit[side] += 1;
    this.flight.lit += 1;
    if (!this.isOpen(side)) return [`STACK ${this.lit[side]} OF 3`];
    this.bars[side].disabled = true;
    this.flight.unlocked = true;
    return ['LIGHTS ON'];
  }

  /** `scorer` was credited a goal (own goals included): the goal they attack locks again from the next turn. */
  goalScored(scorer) {
    this.relock.add(scorer);
  }

  /** LIGHTS ON: the chain finished and scored on one flick. OFF THE COINS: the ball rattled a stack on the way. */
  goalLabel(scorer) {
    if (!this.flight) return '';
    if (this.flight.unlocked && scorer === this.flight.side) return 'LIGHTS ON';
    return this.flight.coins ? 'OFF THE COINS' : '';
  }

  /** Chalk, in each side's colour, beside the stack it must strike next, or at the goal its chain has opened. */
  chalkNotes() {
    return SIDES.map((side) => {
      const stack = this.nextStack(side);
      return stack ? { x: stack.pos.x, z: stack.pos.y + Math.sign(stack.pos.y || 1) * 0.15, text: `STRIKE · ${this.lit[side]}/3 LIT`, side }
        : { x: attackDirection(side) * 1.2, z: 0, text: 'GOAL OPEN', side };
    });
  }

  describe(side, rivalName) {
    const other = SIDES.find((s) => s !== side);
    const chain = (s) => (this.isOpen(s) ? 'GOAL OPEN' : `${this.lit[s]}/3 lit`);
    const you = side === 'home' ? 'Your chain' : `${rivalName}'s chain`;
    const them = side === 'home' ? `${rivalName}'s` : 'Yours';
    return `${you}: ${chain(side)} · ${them}: ${chain(other)}`;
  }
}
