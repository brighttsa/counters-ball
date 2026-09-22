// Street Legends — Roadside Showdown, Tema Motorway Junction.
// A separate mode layered on the real campaign venue (same name, place, rival
// and team); the classic campaign match at this venue is unchanged.
//
// Three acts, taught through play:
//   1 DISCOVER  Solo. Akosua's caps stand still; only the booms move.
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
    blurb: 'Rush hour at the toll plaza. Every flick one boom drops — green lanes are open, amber is about to shut.',
    objective: 'Score through the toll',
    introLines: [
      'Solo challenge · score 1 goal in 8 flicks',
      'GREEN lane = boom up, the ball can pass · RED = boom down',
      'AMBER blinking = open now, shuts on your next flick',
      'Caps slide under the booms; the ball can\'t. Leave the ball under a boom and it jams open',
    ],
    rules: { goalsToWin: 1, flickLimit: 8, awayFlickLimit: 0, threeStarFlicks: 3 },
    awaySlots: [0, 1, 2], // keeper and two back caps: the booms are the defence here
    ballStart: [0.3, 0.05], // rolled up to the plaza: learn the lanes, not the long shot
    opponent: { ...AKOSUA, difficulty: 'easy' },
  }),
  act(2, {
    id: 'legends-roadside-act-2',
    actTitle: 'Rush Hour',
    blurb: 'Akosua collects tolls for her uncle. She knows which boom drops next — and parks a cap in the lane you need.',
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
    blurb: 'Somebody parked a bottle in the road. Akosua wants a rematch, and she is not collecting coins tonight.',
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
