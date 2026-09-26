// Adabraka Primary schoolyard: a 30 cm wooden ruler stands on its edge in each
// half, pinned through a pink eraser in front of the goal. Pure game state.
//
// Each time a ruler's ATTACKER starts a turn, it turns 45° the same way round:
// open (along the pitch) → slanted → across → slanted back → open…
// It never moves during a flick. Caps and the ball bounce off it, so every
// turn offers a different bank angle. Whatever rests in its sweep is pushed
// aside as it turns. (Letting caps pin it was tried: caps come to rest against
// the ruler after bouncing off it, and it froze on ~40% of turns.)
import { SIDE_HOME, SIDE_AWAY, otherSide, GOAL_LINE_X } from '../core/pitch-dimensions-and-constants.js';
import { pushClearOfSegment } from './segment-geometry-helpers.js';

export const RULER_PIVOT_X = 0.75;
export const RULER_HALF_LENGTH = 0.3;
export const RULER_THICKNESS = 0.012;
export const ANGLE_NAMES = ['OPEN', 'SLANTED', 'ACROSS', 'SLANTED BACK'];
const STEP = Math.PI / 4;
const SWEEP_SAMPLES = 12;

export class RulerSeesaws {
  constructor({ offsets = { [SIDE_HOME]: 0, [SIDE_AWAY]: 0 } } = {}) {
    // A ruler is named for the side that DEFENDS the goal behind it; both start open (symmetric table).
    this.rulers = [SIDE_HOME, SIDE_AWAY].map((side) => ({
      side, x: side === SIDE_HOME ? -RULER_PIVOT_X : RULER_PIVOT_X, offset: offsets[side] ?? 0,
      step: 0, segment: null,
    }));
    this.flight = null;
  }

  rulerDefendedBy(side) { return this.rulers.find((r) => r.side === side); }

  /** 0..3 position in the turn cycle, now or `ahead` attacker-turns from now. */
  angleIndex(ruler, ahead = 0) { return (ruler.step + ruler.offset + ahead) % 4; }

  angle(ruler, ahead = 0) { return this.angleIndex(ruler, ahead) * STEP; }

  /** Segment endpoints for a ruler at a given angle (radians, 0 = along the pitch). */
  endpoints(ruler, angle) {
    const dx = Math.cos(angle) * RULER_HALF_LENGTH, dz = Math.sin(angle) * RULER_HALF_LENGTH;
    return { ax: ruler.x - dx, az: -dz, bx: ruler.x + dx, bz: dz };
  }

  attach(physics) {
    for (const ruler of this.rulers) {
      ruler.segment = physics.addStaticSegment({ ...this.endpoints(ruler, this.angle(ruler)), radius: RULER_THICKNESS, kind: 'ruler' });
      ruler.segment.ruler = ruler.side;
    }
  }

  apply(ruler) { Object.assign(ruler.segment, this.endpoints(ruler, this.angle(ruler))); }

  /** Walk the sweep from `from` to `to`, pushing every resting body out of the ruler's way. */
  sweep(ruler, from, to, bodies) {
    for (let i = 1; i <= SWEEP_SAMPLES; i++) {
      const a = from + ((to - from) * i) / SWEEP_SAMPLES;
      const segment = { ...this.endpoints(ruler, a), radius: RULER_THICKNESS };
      for (const b of bodies) {
        // On the line: push toward the side that end of the ruler is turning to.
        const end = Math.sign((b.pos.x - ruler.x) || 1);
        pushClearOfSegment(segment, b, -Math.sin(a) * end, Math.cos(a) * end);
      }
    }
  }

  /** Start of a turn: the ruler the turn-taker attacks turns 45°, sweeping aside what is in its way. */
  advance(turnSide, dynamicBodies) {
    const ruler = this.rulerDefendedBy(otherSide(turnSide));
    const from = this.angle(ruler);
    this.sweep(ruler, from, from + STEP, dynamicBodies);
    ruler.step += 1;
    this.apply(ruler);
    return [];
  }

  beginFlick(side) { this.flight = { side, rulerBank: false }; }

  noteImpact(a, b) {
    if (!this.flight) return;
    const kinds = [a.kind, b.kind];
    if (kinds.includes('ball') && kinds.includes('ruler')) this.flight.rulerBank = true;
  }

  goalLabel(scorer) {
    return this.flight?.side === scorer && this.flight.rulerBank ? 'OFF THE RULER' : '';
  }

  describe(side) {
    const theirs = this.rulerDefendedBy(otherSide(side)), own = this.rulerDefendedBy(side);
    return `Their ruler: ${ANGLE_NAMES[this.angleIndex(theirs)]} → next ${ANGLE_NAMES[this.angleIndex(theirs, 1)]}`
      + ` · Yours next: ${ANGLE_NAMES[this.angleIndex(own, 1)]}`;
  }

  /** Goal mouth centre point for the goal behind a ruler (for bank aiming). */
  goalBehind(ruler) { return { x: Math.sign(ruler.x) * GOAL_LINE_X, z: 0 }; }
}
