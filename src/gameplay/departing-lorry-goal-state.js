// Tamale Lorry Station: each goal is the tailboard of a lorry that is pulling
// out. Pure game state, no rendering.
//
// A goal slides along its end line through five stops (far left … far right)
// and back again. It moves one stop each time its ATTACKER starts a turn, so
// the attacker always shoots at a still goal and can read where it goes next.
// Nothing moves during a flick. The physics goal mouth (`goalCenters`) and
// the two goal-post bodies follow the lorry exactly.
import { SIDE_HOME, SIDE_AWAY, otherSide } from '../core/pitch-dimensions-and-constants.js';

export const LORRY_STOPS = [-0.56, -0.28, 0, 0.28, 0.56];
export const STOP_NAMES = ['FAR LEFT', 'LEFT', 'CENTRE', 'RIGHT', 'FAR RIGHT'];
// Centre, right, far right, right, centre, left, far left, left… a ping-pong.
const CYCLE = [2, 3, 4, 3, 2, 1, 0, 1];
const END_STOPS = [0, 4];

export class DepartingLorryGoals {
  /** @param offsets where each lorry sits in the cycle: both centre, pulling out opposite ways */
  constructor({ offsets = { [SIDE_HOME]: 0, [SIDE_AWAY]: 4 } } = {}) {
    // A goal is named for the side that DEFENDS it: home defends the goal at -x.
    this.goals = [SIDE_HOME, SIDE_AWAY].map((side) => ({
      side, sign: side === SIDE_HOME ? -1 : 1, offset: offsets[side] ?? 0, count: -1, posts: [],
    }));
    this.physics = null;
    this.flight = null;
  }

  goalDefendedBy(side) { return this.goals.find((g) => g.side === side); }

  /** Stop index now, or `ahead` attacker-turns from now. Parked at the centre until its attacker's first turn. */
  stopIndex(goal, ahead = 0) {
    const i = goal.count + 1 + ahead + goal.offset;
    return CYCLE[((i % CYCLE.length) + CYCLE.length) % CYCLE.length];
  }

  center(goal, ahead = 0) { return LORRY_STOPS[this.stopIndex(goal, ahead)]; }

  /** Take over the goal mouths and the goal-post bodies already in `physics`. */
  attach(physics) {
    this.physics = physics;
    for (const goal of this.goals) {
      goal.posts = physics.bodies.filter((b) => b.kind === 'post' && Math.sign(b.pos.x) === goal.sign)
        .map((body) => ({ body, dz: body.pos.y }));
    }
    this.apply();
  }

  apply() {
    for (const goal of this.goals) {
      const z = this.center(goal);
      if (this.physics) this.physics.goalCenters[goal.sign] = z;
      for (const post of goal.posts) { post.body.pos.y = z + post.dz; post.body.prev.y = post.body.pos.y; }
    }
  }

  /** Start of a turn: the lorry the turn-taker attacks pulls one stop along. Returns callouts. */
  advance(turnSide) {
    const goal = this.goalDefendedBy(otherSide(turnSide));
    goal.count += 1;
    this.apply();
    return END_STOPS.includes(this.stopIndex(goal)) ? ['LAST STOP: IT TURNS BACK NEXT'] : [];
  }

  beginFlick(side) { this.flight = { side }; }

  /** Hero label for a goal by `scorer` on the flick being tracked. */
  goalLabel(scorer) {
    if (this.flight?.side !== scorer) return '';
    const stop = this.stopIndex(this.goalDefendedBy(otherSide(scorer)));
    if (END_STOPS.includes(stop)) return 'LAST STOP!';
    return stop === 2 ? '' : 'CAUGHT THE LORRY';
  }

  /** Chalk just inside each end where its lorry stops next. */
  chalkNotes() {
    return this.goals.map((goal) => ({ x: goal.sign * 1.2, z: this.center(goal, 1), icon: 'lorry-stop' }));
  }

  describe(side) {
    const target = this.goalDefendedBy(otherSide(side));
    const own = this.goalDefendedBy(side);
    return `Their lorry: ${STOP_NAMES[this.stopIndex(target)]} → next ${STOP_NAMES[this.stopIndex(target, 1)]}`
      + ` · Your goal next: ${STOP_NAMES[this.stopIndex(own, 1)]}`;
  }
}
