// Nima Market Road kiosk: the enamel change dish. Pure game state.
//
// A curved enamel tray (the dish a kiosk seller keeps coins in) stands on its
// edge around each goal mouth, just in front of the posts. It covers a 100°
// arc of the approach and leaves the rest open. Each time a dish's ATTACKER
// starts a turn it rotates one notch: open left → open edges → open right →
// open edges… Never during a flick. As it turns it sweeps resting caps and
// the ball aside, like the schoolyard ruler.
import { SIDE_HOME, SIDE_AWAY, otherSide, GOAL_LINE_X } from '../core/pitch-dimensions-and-constants.js';
import { pushClearOfSegment } from './segment-geometry-helpers.js';

export const DISH_RADIUS = 0.3;
export const DISH_SPAN = (100 * Math.PI) / 180;
export const DISH_THICKNESS = 0.012;
const DISH_PIECES = 6;
// Where the covered arc is centred, relative to straight out of the goal (+ = toward +z).
export const COVER_ANGLES = [(40 * Math.PI) / 180, 0, (-40 * Math.PI) / 180];
export const OPEN_NAMES = ['OPEN LEFT', 'OPEN EDGES', 'OPEN RIGHT'];
const CYCLE = [1, 2, 1, 0];
const SWEEP_SAMPLES = 10;

export class ChangeDishes {
  /** Both parked covering the centre; they then turn in mirror image (point-symmetric table). */
  constructor({ offsets = { [SIDE_HOME]: 2, [SIDE_AWAY]: 0 } } = {}) {
    this.dishes = [SIDE_HOME, SIDE_AWAY].map((side) => ({
      side, sign: side === SIDE_HOME ? -1 : 1, offset: offsets[side] ?? 0, count: -1, segments: [],
    }));
    this.flight = null;
  }

  dishDefendedBy(side) { return this.dishes.find((d) => d.side === side); }

  /** Index into COVER_ANGLES now, or `ahead` attacker-turns from now. */
  state(dish, ahead = 0) {
    const i = dish.count + 1 + ahead + dish.offset;
    return CYCLE[((i % CYCLE.length) + CYCLE.length) % CYCLE.length];
  }

  /** World angle (from +x, toward +z) of a point on the dish at relative angle `phi`. */
  worldAngle(dish, phi) { return dish.sign > 0 ? Math.PI - phi : phi; }

  /** The covered arc as short straight pieces, centred on relative angle `center`. */
  pieces(dish, center) {
    const cx = dish.sign * GOAL_LINE_X;
    const point = (phi) => {
      const a = this.worldAngle(dish, phi);
      return { x: cx + Math.cos(a) * DISH_RADIUS, z: Math.sin(a) * DISH_RADIUS };
    };
    return Array.from({ length: DISH_PIECES }, (_, i) => {
      const p = point(center - DISH_SPAN / 2 + (DISH_SPAN * i) / DISH_PIECES);
      const q = point(center - DISH_SPAN / 2 + (DISH_SPAN * (i + 1)) / DISH_PIECES);
      return { ax: p.x, az: p.z, bx: q.x, bz: q.z, radius: DISH_THICKNESS };
    });
  }

  attach(physics) {
    for (const dish of this.dishes) {
      dish.segments = this.pieces(dish, COVER_ANGLES[this.state(dish)])
        .map((piece) => Object.assign(physics.addStaticSegment({ ...piece, kind: 'dish' }), { dish: dish.side }));
    }
  }

  apply(dish) {
    this.pieces(dish, COVER_ANGLES[this.state(dish)]).forEach((piece, i) => Object.assign(dish.segments[i], piece));
  }

  /** Start of a turn: the dish the turn-taker attacks turns one notch, sweeping things aside. */
  advance(turnSide, dynamicBodies) {
    const dish = this.dishDefendedBy(otherSide(turnSide));
    const from = COVER_ANGLES[this.state(dish)];
    dish.count += 1;
    const to = COVER_ANGLES[this.state(dish)];
    const cx = dish.sign * GOAL_LINE_X;
    for (let i = 1; i <= SWEEP_SAMPLES; i++) {
      for (const piece of this.pieces(dish, from + ((to - from) * i) / SWEEP_SAMPLES)) {
        for (const b of dynamicBodies) {
          // On the rim line: push away from the goal centre (outwards).
          const r = Math.hypot(b.pos.x - cx, b.pos.y) || 1;
          pushClearOfSegment(piece, b, (b.pos.x - cx) / r, b.pos.y / r);
        }
      }
    }
    this.apply(dish);
    return [];
  }

  beginFlick(side) { this.flight = { side, rattled: false }; }

  noteImpact(a, b) {
    if (!this.flight) return;
    const kinds = [a.kind, b.kind];
    if (kinds.includes('ball') && kinds.includes('dish')) this.flight.rattled = true;
  }

  goalLabel(scorer) {
    if (this.flight?.side !== scorer) return '';
    if (this.state(this.dishDefendedBy(otherSide(scorer))) === 1) return 'EXACT CHANGE';
    return this.flight.rattled ? 'OFF THE DISH' : '';
  }

  describe(side) {
    const theirs = this.dishDefendedBy(otherSide(side)), own = this.dishDefendedBy(side);
    return `Their dish: ${OPEN_NAMES[this.state(theirs)]} → next ${OPEN_NAMES[this.state(theirs, 1)]}`
      + ` · Yours next: ${OPEN_NAMES[this.state(own, 1)]}`;
  }
}
