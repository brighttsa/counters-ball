// Street Legends — Schoolyard Break, Adabraka Primary, Accra.
// Layered on the real campaign venue (same name, place, rival, team); the
// classic campaign match here is unchanged.
//
// A 30 cm ruler stands on its edge in each half, pinned through an eraser,
// and turns 45° each time its attacker starts a turn. Bank off it.
//   1 DISCOVER  An active rookie with three caps; learn the mechanic in a match.
//   2 MASTER    Kwame plays, and mostly ignores the ruler.
//   3 SHOWDOWN  First to two before the last bell.
import { CAMPAIGN_LEVELS } from './campaign-level-definitions.js';

const SCHOOLYARD = CAMPAIGN_LEVELS.find((level) => level.id === 'schoolyard');

// Kwame is a straight shooter: he barely thinks about the ruler.
const KWAME = { ...SCHOOLYARD.opponent, tactics: { block: 0.5, setup: 0.4, caution: 0.6 } };
const RULER_SEESAW = { type: 'ruler-seesaw' };

const act = (number, overrides) => ({
  ...SCHOOLYARD,
  mode: 'legends',
  mechanic: RULER_SEESAW,
  tutorial: false,
  legend: { venue: SCHOOLYARD.name, act: number, acts: 3 },
  ...overrides,
});

export const SCHOOLYARD_RULER_SEESAW_ACTS = [
  act(1, {
    id: 'legends-schoolyard-act-1',
    actTitle: 'Before the Bell',
    blurb: 'A ruler in an eraser. It turns every flick. Kwame reckons you can\'t use it.',
    objective: 'Score past the turning ruler',
    introLines: [
      'First to 1 · 10 flicks each',
      'The ruler turns 45° every flick: open, slanted, across, slanted back',
      'Watch the ruler turn between turns. Bounce the ball off it',
      'The turn sweeps caps and ball aside. Watch where they settle',
    ],
    rules: { goalsToWin: 1, flickLimit: 10, threeStarFlicks: 5 },
    awaySlots: [0, 3, 4], // keeper and two forwards: a live rival with room to learn
    ballStart: [0.5, 0.42], // off to one side: the ruler's angle decides the route (playtest: 78% at 10 flicks)
    opponent: { ...KWAME, difficulty: 'rookie' },
  }),
  act(2, {
    id: 'legends-schoolyard-act-2',
    actTitle: 'Ruler Rules',
    blurb: 'Kwame\'s toffee is back on the line. He still shoots straight at the ruler.',
    objective: 'Beat Kwame around the ruler',
    introLines: [
      'First to 1 · 14 flicks each',
      'Line up for where the ruler turns next, not where it is now',
      'Your ruler turns too: across is a wall, open is a highway',
    ],
    rules: { goalsToWin: 1, flickLimit: 14, threeStarFlicks: 6 },
    opponent: { ...KWAME, difficulty: 'rookie' },
  }),
  act(3, {
    id: 'legends-schoolyard-act-3',
    actTitle: 'Last Bell',
    blurb: 'The bell is close. First to two keeps the toffee. The class is watching.',
    objective: 'First to 2 before the bell',
    introLines: [
      'First to 2 · 16 flicks each',
      'A goal off the ruler is OFF THE RULER',
      'Across is a wall, open is a highway: time your shot to the turn',
    ],
    rules: { goalsToWin: 2, flickLimit: 16, threeStarFlicks: 9 },
    opponent: { ...KWAME, difficulty: 'easy' },
  }),
];
