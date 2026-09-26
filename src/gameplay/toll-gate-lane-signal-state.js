// Tema Motorway Junction toll plazas: pure game state, no rendering.
//
// Each half of the table has a toll plaza across the approach to its goal: two
// booths split it into three lanes (left, centre, right), and every lane has a
// boom. One boom per plaza is DOWN; the other two lanes are open. The closed
// boom steps left → centre → right → centre each time that plaza's ATTACKER
// starts a turn, so the rhythm reads like a traffic light:
//   GREEN open · AMBER open now, closes on your next shot · RED boom down.
// Booms only move BETWEEN turns, never during a flick.
//
// Scale does the rest: a bottle cap (0.024 tall) slides UNDER a boom arm, the
// paper ball (0.07 across) does not. Caps roam freely to set up and to block
// lanes with their bodies; only the ball has to find an open lane. A boom
// cannot come down on a ball resting beneath it — it jams open.
import { SIDE_HOME, SIDE_AWAY, otherSide } from '../core/pitch-dimensions-and-constants.js';

export const PLAZA_X = 0.68;                 // plazas sit at ±x, between the two formation rows
export const BOOTH_Z = 0.36;
export const BOOTH_RADIUS = 0.075;
export const KERB_INNER_Z = 0.86;            // painted kerb islands close the strip beside the rails
export const BOOM_BEAD_RADIUS = 0.028;       // a boom is a row of static beads for circle physics
export const LANE_KEYS = ['left', 'centre', 'right'];
export const LANES = [
  { key: 'left', z0: -KERB_INNER_Z, z1: -BOOTH_Z - BOOTH_RADIUS },
  { key: 'centre', z0: -BOOTH_Z + BOOTH_RADIUS, z1: BOOTH_Z - BOOTH_RADIUS },
  { key: 'right', z0: BOOTH_Z + BOOTH_RADIUS, z1: KERB_INNER_Z },
].map((lane) => ({ ...lane, center: (lane.z0 + lane.z1) / 2, half: (lane.z1 - lane.z0) / 2 }));

// Which boom is down: left, centre, right, centre… — readable after two turns.
const CYCLE = [0, 1, 2, 1];

export class TollGateLaneSignals {
  /** @param offsets where each plaza starts in the cycle, so the two ends differ */
  constructor({ offsets = { [SIDE_HOME]: 0, [SIDE_AWAY]: 2 } } = {}) {
    // A plaza is named for the side that DEFENDS it (the goal it guards).
    this.plazas = [SIDE_HOME, SIDE_AWAY].map((side) => ({
      side, x: side === SIDE_HOME ? -PLAZA_X : PLAZA_X, offset: offsets[side] ?? 0,
      count: -1,          // this plaza's signal steps; its attacker's first turn makes it 0
      jammed: new Set(), booms: [[], [], []],
    }));
    this.flight = null;
    this.lastJams = [];
  }

  plazaDefendedBy(side) { return this.plazas.find((p) => p.side === side); }

  /** The lane whose boom is down now, or `ahead` attacker-turns from now. */
  closedLane(plaza, ahead = 0) {
    const i = plaza.count + ahead + plaza.offset;
    return CYCLE[((i % CYCLE.length) + CYCLE.length) % CYCLE.length];
  }

  /** Open now (a jammed boom counts as open), or on the attacker's turn `ahead` from now. */
  isOpen(plaza, lane, ahead = 0) {
    return lane !== this.closedLane(plaza, ahead) || (ahead === 0 && plaza.jammed.has(lane));
  }

  /** Lanes open for this plaza's attacker on their next turn. */
  openNext(plaza) { return [0, 1, 2].filter((lane) => this.isOpen(plaza, lane, 1)); }

  laneAt(z) {
    return LANES.findIndex((lane) => z >= lane.z0 - 0.02 && z <= lane.z1 + 0.02);
  }

  /** Static bodies for physics: booths, kerb islands and every boom bead. */
  attach(physics) {
    for (const plaza of this.plazas) {
      for (const z of [-BOOTH_Z, BOOTH_Z]) physics.addStaticCircle({ x: plaza.x, z, radius: BOOTH_RADIUS, kind: 'booth' });
      for (const sign of [-1, 1]) {
        for (let z = KERB_INNER_Z + 0.05; z < 1.14; z += 0.07) physics.addStaticCircle({ x: plaza.x, z: z * sign, radius: 0.05, kind: 'kerb' });
      }
      LANES.forEach((lane, index) => {
        const count = Math.max(2, Math.ceil((lane.z1 - lane.z0) / (BOOM_BEAD_RADIUS * 1.6)));
        for (let i = 0; i <= count; i++) {
          const z = lane.z0 + ((lane.z1 - lane.z0) * i) / count;
          const bead = physics.addStaticCircle({ x: plaza.x, z, radius: BOOM_BEAD_RADIUS, kind: 'boom' });
          bead.blocksOnly = 'ball';
          bead.plaza = plaza.side;
          bead.lane = index;
          plaza.booms[index].push(bead);
        }
      });
    }
    this.applyToPhysics();
  }

  applyToPhysics() {
    for (const plaza of this.plazas) {
      plaza.booms.forEach((beads, lane) => {
        const open = this.isOpen(plaza, lane);
        for (const bead of beads) bead.disabled = open;
      });
    }
  }

  /** A ball resting under a boom's line keeps that boom from closing. */
  isLaneOccupied(plaza, lane, dynamicBodies) {
    const { z0, z1 } = LANES[lane];
    return dynamicBodies.some((b) => b.kind === 'ball' && Math.abs(b.pos.x - plaza.x) < b.radius + BOOM_BEAD_RADIUS
      && b.pos.y + b.radius > z0 && b.pos.y - b.radius < z1);
  }

  /**
   * Called at the start of every turn, while everything is at rest: the plaza
   * the turn-taker attacks steps its signal. Returns lanes that jammed open.
   */
  advance(turnSide, dynamicBodies) {
    const plaza = this.plazaDefendedBy(otherSide(turnSide));
    plaza.count += 1;
    plaza.jammed.clear();
    const closing = this.closedLane(plaza);
    const jams = this.isLaneOccupied(plaza, closing, dynamicBodies) ? [{ plaza: plaza.side, lane: closing }] : [];
    for (const jam of jams) plaza.jammed.add(jam.lane);
    this.lastJams = jams;
    this.applyToPhysics();
    return jams;
  }

  // ---- Hero-moment tracking for one flick -------------------------------

  beginFlick(side) { this.flight = { side, through: null, boomBank: false }; }

  /** Watch the ball cross a plaza line during a flick. */
  observe(ball) {
    const f = this.flight;
    if (!f) return;
    for (const plaza of this.plazas) {
      if (plaza.side === f.side) continue; // only the plaza being attacked matters
      const before = ball.prev.x - plaza.x, after = ball.pos.x - plaza.x;
      if (before === 0 || Math.sign(before) === Math.sign(after)) continue;
      const lane = this.laneAt(ball.pos.y);
      if (lane >= 0) f.through = { lane, jammed: plaza.jammed.has(lane) };
    }
  }

  noteImpact(a, b) {
    if (!this.flight) return;
    const pair = [a.kind, b.kind];
    if (pair.includes('ball') && pair.includes('boom')) this.flight.boomBank = true;
  }

  /** Label for a goal scored by `scorer` on the flick being tracked, or ''. */
  goalLabel(scorer) {
    const f = this.flight;
    if (!f || f.side !== scorer) return '';
    if (f.through?.jammed) return 'JAMMED THE GATE';
    if (f.boomBank) return 'OFF THE BOOM';
    if (f.through) return `THROUGH THE ${LANE_KEYS[f.through.lane].toUpperCase()} TOLL`;
    return '';
  }

  describe(side) {
    const target = this.plazaDefendedBy(otherSide(side));
    const own = this.plazaDefendedBy(side);
    const name = (lane) => LANE_KEYS[lane].toUpperCase();
    const closed = [0, 1, 2].filter((lane) => !this.isOpen(target, lane)).map(name).join(' + ') || 'NONE (jammed!)';
    return `Boom down: ${closed} · Closes next: ${name(this.closedLane(target, 1))} · Your gate closes ${name(this.closedLane(own, 1))}`;
  }
}
