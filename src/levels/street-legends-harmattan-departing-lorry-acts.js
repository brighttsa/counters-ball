// Street Legends — Harmattan Haze, Tamale Lorry Station.
// Layered on the real campaign venue (same name, place, rival, team, dusty
// friction); the classic campaign match here is unchanged.
//
// The goals ride on departing lorries: one stop along the end line each time
// their attacker starts a turn, turning back at the far stops.
//   1 DISCOVER  Solo. Abdul's keeper stands still; only the lorry moves.
//   2 MASTER    Abdul plays, chasing wherever the lorry goes next.
//   3 SHOWDOWN  First to two in the dust, pebbles on the table.
import { CAMPAIGN_LEVELS } from './campaign-level-definitions.js';

const HARMATTAN = CAMPAIGN_LEVELS.find((level) => level.id === 'harmattan');

// Abdul chases the goal: he loves a setup for the next stop and defends loosely.
const ABDUL = { ...HARMATTAN.opponent, tactics: { block: 0.8, setup: 1.5, caution: 0.8 } };
const DEPARTING_LORRY = { type: 'departing-lorry' };

const act = (number, overrides) => ({
  ...HARMATTAN,
  mode: 'legends',
  mechanic: DEPARTING_LORRY,
  tutorial: false,
  legend: { venue: HARMATTAN.name, act: number, acts: 3 },
  ...overrides,
});

export const HARMATTAN_DEPARTING_LORRY_ACTS = [
  act(1, {
    id: 'legends-harmattan-act-1',
    actTitle: 'Catch the Lorry',
    blurb: 'The Bolga Express is pulling out, and the goal is strapped to its side. Read where it stops next.',
    objective: 'Score into the moving lorry',
    introLines: [
      'Solo challenge · score 1 goal in 8 flicks',
      'Each flick the lorry drives one stop along the end line',
      'The ghost goal shows its next stop; it turns back at the far ends',
      'The keeper stays put. Score when the lorry pulls away from him',
    ],
    obstacles: [],
    rules: { goalsToWin: 1, flickLimit: 8, awayFlickLimit: 0, threeStarFlicks: 3 },
    awaySlots: [0], // only the sleepy keeper: the moving goal is the challenge
    ballStart: [0.72, 0.05],
    opponent: { ...ABDUL, difficulty: 'easy' },
  }),
  act(2, {
    id: 'legends-harmattan-act-2',
    actTitle: 'Loading Bay',
    blurb: 'Abdul loads sacks for his father between games. He always knows where the lorry is going.',
    objective: 'Beat Abdul to the lorry',
    introLines: [
      'First to 1 · 18 flicks each (dust eats short flicks)',
      'Line the ball up with their goal\'s NEXT stop, not where it is now',
      'Your own goal moves too: slide a cap across to where it is going',
    ],
    rules: { goalsToWin: 1, flickLimit: 18, threeStarFlicks: 7 },
    opponent: { ...ABDUL, difficulty: 'medium' },
  }),
  act(3, {
    id: 'legends-harmattan-act-3',
    actTitle: 'Last Lorry to Bolgatanga',
    blurb: 'Dust on everything, pebbles in the road and one lorry left tonight. Abdul wants the ride.',
    objective: 'First to 2 before the last lorry leaves',
    introLines: [
      'First to 2 · 20 flicks each',
      'Dusty table: caps stop sooner, so flick harder than you think',
      'Hit the lorry at a far stop for a LAST STOP goal',
    ],
    rules: { goalsToWin: 2, flickLimit: 20, threeStarFlicks: 10 },
    opponent: { ...ABDUL, difficulty: 'medium' },
  }),
];
