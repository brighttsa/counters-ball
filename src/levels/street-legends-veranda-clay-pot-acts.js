// Street Legends — Veranda Derby, Auntie Ama's Veranda, Kumasi.
// Layered on the real campaign venue (same name, place, rival, team); the
// classic campaign match here is unchanged.
//
// Auntie Ama's clay pots stand on the table, three in each half, and her rule
// is simple: no straight goals. The ball must bounce off a pot or the rail first.
//   1 DISCOVER  An active rookie with three caps; learn the mechanic in a match.
//   2 MASTER    Yaw plays, and he always looks for the bank.
//   3 SHOWDOWN  First to two before Auntie Ama calls everyone in.
import { CAMPAIGN_LEVELS } from './campaign-level-definitions.js';

const VERANDA = CAMPAIGN_LEVELS.find((level) => level.id === 'veranda');

// Yaw banks everything: strong setup habits, ordinary defence.
const YAW = { ...VERANDA.opponent, tactics: { block: 1, setup: 1.5, caution: 1 } };
const CLAY_POT_MAZE = { type: 'clay-pot-maze' };

const act = (number, overrides) => ({
  ...VERANDA,
  mode: 'legends',
  mechanic: CLAY_POT_MAZE,
  obstacles: [], // the pots are the obstacles here
  tutorial: false,
  legend: { venue: VERANDA.name, act: number, acts: 3 },
  ...overrides,
});

export const VERANDA_CLAY_POT_ACTS = [
  act(1, {
    id: 'legends-veranda-act-1',
    actTitle: "Auntie Ama's Rule",
    blurb: 'Auntie Ama is watching from the doorway. Her pots are in play. Straight goals don\'t count.',
    objective: 'Score a bounce goal: off a pot or the side',
    introLines: [
      'First to 1 · 12 flicks each · bounce goals only',
      'No straight goals: the ball must bounce off a pot or the side on that flick',
      'Straight in? Waved off, and Auntie Ama throws the ball back',
      'Clip the big pot and the ball rolls in past the keeper',
    ],
    rules: { goalsToWin: 1, flickLimit: 12, threeStarFlicks: 6 },
    awaySlots: [0, 3, 4], // keeper and two forwards: a live rival with room to learn
    ballStart: [1.2, 0.22],
    opponent: { ...YAW, difficulty: 'rookie' },
  }),
  act(2, {
    id: 'legends-veranda-act-2',
    actTitle: 'Mind the Pots',
    blurb: 'Yaw knows the name of every pot. He also knows where the ball lands next.',
    objective: 'Beat Yaw with bounce goals',
    introLines: [
      'First to 1 · 16 flicks each · no straight goals',
      'Leave the ball where a pot can turn it into their goal',
      "Don't leave it where a pot turns it into yours",
    ],
    rules: { goalsToWin: 1, flickLimit: 16, threeStarFlicks: 7 },
    opponent: { ...YAW, difficulty: 'easy' },
  }),
  act(3, {
    id: 'legends-veranda-act-3',
    actTitle: 'The Derby',
    blurb: 'The whole compound is watching. First to two before Auntie Ama calls everyone in.',
    objective: 'First to 2, bounce goals only',
    introLines: [
      'First to 2 · 18 flicks each · no straight goals',
      'Two pots on the way in is a DOUBLE POT',
      'Yaw sets up every bounce he can: leave him nothing',
    ],
    rules: { goalsToWin: 2, flickLimit: 18, threeStarFlicks: 10 },
    opponent: { ...YAW, difficulty: 'easy' },
  }),
];
