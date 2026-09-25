// Auntie Ama's veranda, Kumasi: her clay pots are on the table. Pure game state.
//
// Three pots in each half: a big one guarding the goal mouth and two splitting
// the approach into three routes. Auntie
// Ama's rule: no straight goals. The ball must bounce off a pot or the table
// rail on that flick; a straight shot that goes in is waved off. (Pots alone
// made every goal a hard chain shot: ~20% Act 1 wins even for a good player.)
// Nothing moves between turns here; the novelty is the rule and the banks.
import { attackDirection, GOAL_LINE_X } from '../core/pitch-dimensions-and-constants.js';

export const POT_RADIUS = 0.13;
// Away half (the goal home attacks); the home half is the same layout turned through the centre spot.
// Auntie Ama's big pot sits in front of the goal, just ahead of the keeper: kiss
// its side and the ball glances in. Two more pots split the approach. (Earlier
// layouts made every goal a cap→ball→pot→goal chain: ~20% Act 1 wins.)
const AWAY_HALF = [[1.1, 0], [0.62, 0.5], [0.62, -0.5]];
const THROW_BACK = [1.2, 0.18]; // clear of the pots and the keeper, in front of the goal

export class ClayPotMaze {
  constructor() {
    this.pots = [];
    this.flight = null;
    this.denied = 0;
  }

  /** Pots, the bank rule and the goal-denied hook go into the physics engine. */
  attach(physics) {
    this.physics = physics;
    for (const sign of [1, -1]) {
      for (const [x, z] of AWAY_HALF) {
        const body = physics.addStaticCircle({ x: sign * x, z: sign * z, radius: POT_RADIUS, kind: 'pot' });
        this.pots.push(body);
      }
    }
    physics.goalRequiresTouchOf = ['pot', 'rail'];
  }

  /** Pots guarding the goal that `side` attacks. */
  potsFacing(side) { return this.pots.filter((p) => Math.sign(p.pos.x) === attackDirection(side)); }

  /** Start of a turn: a ball left in the net after a waved-off shot is thrown back out. */
  advance(_turnSide, dynamicBodies) {
    const ball = dynamicBodies.find((b) => b.kind === 'ball');
    if (!ball || Math.abs(ball.pos.x) <= GOAL_LINE_X) return [];
    const sign = Math.sign(ball.pos.x);
    ball.pos.set(sign * THROW_BACK[0], sign * THROW_BACK[1]);
    ball.prev.copy(ball.pos);
    return ['AUNTIE AMA THROWS IT BACK'];
  }

  beginFlick(side) {
    this.flight = { side, pots: new Set() };
    this.physics?.clearBankTouches();
  }

  noteImpact(a, b) {
    if (!this.flight) return;
    const pot = a.kind === 'pot' ? a : b.kind === 'pot' ? b : null;
    if (pot && (a.kind === 'ball' || b.kind === 'ball')) this.flight.pots.add(pot);
  }

  /** Every goal that counts here was banked (the physics rule), own goals included. */
  goalLabel() {
    const pots = this.flight?.pots.size ?? 0;
    return pots >= 2 ? 'DOUBLE POT' : pots === 1 ? 'OFF THE POT' : 'OFF THE RAIL';
  }

  /** Auntie Ama's rule, chalked once just below the centre spot: it holds at both goals. */
  chalkNotes() {
    return [{ x: 0, z: 0.22, icon: 'bank-curve' }];
  }

  describe() {
    return `No straight goals: bounce it off a pot or the rail first · ${this.denied} waved off so far`;
  }
}
