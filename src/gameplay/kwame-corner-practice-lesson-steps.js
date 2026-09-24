// Kwame's Corner: the practice table's lessons, in order. Each step says what Kwame tells the player,
// how the table is laid out for it (`setup`, applied when the step starts and again after a miss), and
// what completes it. Table coordinates: x along the pitch (home attacks +x), y = world z.
// Positions: `home` is keyed by the cap's index in the home formation; the away keeper is `away[0]`.
const fine = () => globalThis.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches ?? false;

export const PRACTICE_LESSONS = [
  {
    id: 'pick', say: 'Touch one of your red caps and pull back. That line is your aim.',
    setup: { ball: [0, 0] },
    done: ({ session }) => Boolean(session.input.selected),
  },
  {
    id: 'flick', say: 'Now let go. Flick it into the ball. Pull further for more power.',
    done: ({ attempt }) => attempt.ballMoved,
  },
  {
    id: 'ring', say: 'Knock the ball into my chalk ring.', retry: true,
    setup: { ball: [0, 0], home: { 4: [-.3, .1] }, ring: { x: .62, y: -.32, r: .2 } },
    done: ({ attempt }) => attempt.restedInRing,
  },
  {
    id: 'bank', say: 'My cap blocks the straight line. Bank it off the rail into the goal.', retry: true,
    // The ball sits near the rail so the bank path is short (about 1.6 units, roughly ±9° of aim to spare):
    // a first bank should be learnable in a few tries, not a trick shot.
    setup: { ball: [.6, .85], home: { 3: [.49, .69] }, away: { 0: [1.05, .425] }, bankLine: true, railOnly: true },
    done: ({ attempt }) => attempt.scored,
  },
  {
    id: 'peek', say: 'Sometimes caps hide each other. Hold Tactical peek to see the whole table.',
    glow: 'camera-peek',
    done: ({ control }) => control.peeking,
  },
  {
    id: 'street', say: () => (fine() ? 'Get low to see your line: press 3 for Street view.'
      : 'Get low to see your line: tap Camera, pick Street Level.'),
    glow: 'camera-menu',
    done: ({ control }) => control.mode === 'street',
  },
];

/** Misses on a target lesson before Kwame lets it go and moves on, so nobody gets stuck. */
export const PRACTICE_MAX_MISSES = 3;

export const PRACTICE_FINISH_LINE = 'Sharp! You\'re ready for the street. Go and beat me for real.';

/** Put the ball and caps where a lesson wants them; everything not named goes back to its kickoff spot. */
export function applyPracticeSetup(session, setup = {}) {
  const place = (body, [x, y]) => { body.pos.set(x, y); body.prev.set(x, y); body.vel.set(0, 0); };
  const bySide = side => session.entries.filter(e => e.side === side);
  for (const side of ['home', 'away']) {
    bySide(side).forEach((entry, i) => place(entry.body, setup[side]?.[i] ?? entry.home));
  }
  place(session.ballBody, setup.ball ?? [0, 0]);
  session.physics.goalRequiresTouchOf = setup.railOnly ? ['rail'] : null;
}

export const lessonLine = lesson => (typeof lesson.say === 'function' ? lesson.say() : lesson.say);
