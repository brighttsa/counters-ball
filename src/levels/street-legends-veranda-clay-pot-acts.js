// Street Legends — Veranda Derby, Auntie Ama's Veranda, Kumasi.
// Layered on the real campaign venue (same name, place, rival, team); the
// classic campaign match here is unchanged.
//
// Auntie Ama's clay pots stand on the table, three in each half, and her rule
// is simple: no straight goals. The ball must bounce off a pot or the rail first.
//   1 DISCOVER  Solo. Yaw's keeper stands still; learn to bank off a pot.
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
    blurb: 'Her pots are on the table and she is watching from the doorway. Straight goals don\'t count here.',
    objective: 'Score a bank goal: off a pot or the rail',
    introLines: [
      'Solo challenge · score 1 bank goal in 10 flicks',
      'No straight goals: the ball must bounce off a pot or the rail on that flick',
      'Straight in? Waved off, and Auntie Ama throws the ball back',
      'Kiss the side of the big pot and it glances in past the keeper',
    ],
    rules: { goalsToWin: 1, flickLimit: 10, awayFlickLimit: 0, threeStarFlicks: 4 },
    awaySlots: [0],
    ballStart: [1.2, 0.22],
    opponent: { ...YAW, difficulty: 'easy' },
  }),
  act(2, {
    id: 'legends-veranda-act-2',
    actTitle: 'Mind the Pots',
    blurb: 'Yaw learned banking on this veranda. He knows every pot by name.',
    objective: 'Beat Yaw with bank goals',
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
    blurb: 'Golden hour, the whole compound watching. First to two before Auntie Ama calls everyone in to eat.',
    objective: 'First to 2, bank goals only',
    introLines: [
      'First to 2 · 18 flicks each · no straight goals',
      'Two pots on the way in is a DOUBLE POT',
      'Yaw sets up every bank he can: leave him nothing',
    ],
    rules: { goalsToWin: 2, flickLimit: 18, threeStarFlicks: 10 },
    opponent: { ...YAW, difficulty: 'easy' },
  }),
];
