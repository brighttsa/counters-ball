// Street Legends — Roadside Showdown, Tema Motorway Junction.
// A separate mode layered on the real campaign venue (same name, place, rival
// and team); the classic campaign match at this venue is unchanged.
//
// Three acts, taught through play:
//   1 DISCOVER  An active rookie with three caps; learn the mechanic in a match.
//   2 MASTER    Akosua plays, and she knows the signal cycle.
//   3 SHOWDOWN  First to two, a bottle in the road, Akosua at her sharpest.
import { CAMPAIGN_LEVELS } from './campaign-level-definitions.js';

const ROADSIDE = CAMPAIGN_LEVELS.find((level) => level.id === 'roadside');

// Akosua, the toll collector: she parks caps in the lane that opens for you
// next and punishes a ball left lined up with her open lane.
const AKOSUA = { ...ROADSIDE.opponent, tactics: { block: 1.6, setup: 0.8, caution: 1.3 } };
const TOLL_GATES = { type: 'toll-gates' };

const act = (number, overrides) => ({
  ...ROADSIDE,
  mode: 'legends',
  mechanic: TOLL_GATES,
  obstacles: [],
  tutorial: false,
  legend: { venue: ROADSIDE.name, act: number, acts: 3 },
  ...overrides,
});

export const ROADSIDE_TOLL_GATE_ACTS = [
  act(1, {
    id: 'legends-roadside-act-1',
    actTitle: 'Green Means Go',
    blurb: 'Rush hour. One boom drops every flick. Green is open; amber is next to close.',
    objective: 'Score through an open toll lane',
    introLines: [
      'First to 1 · 10 flicks each',
      'GREEN lane = boom up, the ball can pass · RED = boom down',
      'AMBER blinking = open now, shuts on your next flick',
      'Caps slide under the booms; the ball can\'t. Leave the ball under a boom and it jams open',
    ],
    rules: { goalsToWin: 1, flickLimit: 10, threeStarFlicks: 5 },
    awaySlots: [0, 3, 4], // keeper and two forwards: a live rival with room to learn
    ballStart: [0.3, 0.05], // rolled up to the plaza: learn the lanes, not the long shot
    opponent: { ...AKOSUA, difficulty: 'rookie' },
  }),
  act(2, {
    id: 'legends-roadside-act-2',
    actTitle: 'Rush Hour',
    blurb: 'Akosua knows which boom drops next. She has a cap waiting in your lane.',
    objective: 'Beat Akosua through the booms',
    introLines: [
      'First to 1 · 14 flicks each',
      'Set the ball up in front of a lane that stays green for your next shot',
      'Park a cap in the lane she needs: caps slide under booms, the ball doesn\'t'
    ],
    rules: { goalsToWin: 1, flickLimit: 14, threeStarFlicks: 6 },
    opponent: { ...AKOSUA, difficulty: 'medium' },
  }),
  act(3, {
    id: 'legends-roadside-act-3',
    actTitle: 'Last Toll Before the Motorway',
    blurb: 'A bottle blocks the road. Akosua wants a rematch, not your loose change.',
    objective: 'First to 2 at the junction',
    introLines: [
      'First to 2 · 16 flicks each',
      'Bank off a lowered boom, jam a gate, thread the green lane',
      'A bottle blocks the middle of the road',
    ],
    obstacles: [{ type: 'bottle', x: 0.02, z: -0.5 }],
    rules: { goalsToWin: 2, flickLimit: 16, threeStarFlicks: 9 },
    // Medium aim with sharper toll-collector habits: playtests vs 'hard' were a wall (0 of 20).
    opponent: { ...AKOSUA, difficulty: 'medium', tactics: { block: 2, setup: 1, caution: 1.5 } },
  }),
];
