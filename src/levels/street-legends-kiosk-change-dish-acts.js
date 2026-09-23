// Street Legends — Kiosk Corner, Nima Market Road.
// Layered on the real campaign venue (same name, place, rival, team); the
// classic campaign match here is unchanged.
//
// An enamel change dish stands around each goal mouth, covering part of it,
// and turns one notch each time its attacker starts a turn. Find the gap.
//   1 DISCOVER  Solo. Esi's keeper stands still; only the dish turns.
//   2 MASTER    Esi plays, and she waits for the gap to face her.
//   3 SHOWDOWN  First to two at closing time.
import { CAMPAIGN_LEVELS } from './campaign-level-definitions.js';

const KIOSK = CAMPAIGN_LEVELS.find((level) => level.id === 'kiosk');

// Esi is patient: she sets the ball up for the next gap rather than forcing it.
const ESI = { ...KIOSK.opponent, tactics: { block: 0.8, setup: 1.6, caution: 1 } };
const CHANGE_DISH = { type: 'change-dish' };

const act = (number, overrides) => ({
  ...KIOSK,
  mode: 'legends',
  mechanic: CHANGE_DISH,
  tutorial: false,
  legend: { venue: KIOSK.name, act: number, acts: 3 },
  ...overrides,
});

export const KIOSK_CHANGE_DISH_ACTS = [
  act(1, {
    id: 'legends-kiosk-act-1',
    actTitle: 'Exact Change',
    blurb: 'Kofi\'s change dish guards the goal. It turns every flick. Find the gap.',
    objective: 'Score through the gap in the dish',
    introLines: [
      'Solo challenge · score 1 goal in 10 flicks',
      'The dish turns every flick: open left, open edges, open right, open edges',
      'The chalk arc shows where it covers next',
      'Score when only the edges are open for EXACT CHANGE',
    ],
    rules: { goalsToWin: 1, flickLimit: 10, awayFlickLimit: 0, threeStarFlicks: 3 },
    awaySlots: [0],
    ballStart: [0.8, 0.3],
    opponent: { ...ESI, difficulty: 'easy' },
  }),
  act(2, {
    id: 'legends-kiosk-act-2',
    actTitle: 'Rush at the Hatch',
    blurb: 'A queue at the hatch. Esi has time for one more shot, and she won\'t rush it.',
    objective: 'Beat Esi through the dish',
    introLines: [
      'First to 1 · 14 flicks each',
      'Set the ball up for where the gap will be next',
      'Your dish turns too: watch which side it leaves open for her',
    ],
    rules: { goalsToWin: 1, flickLimit: 14, threeStarFlicks: 6 },
    opponent: { ...ESI, difficulty: 'easy' },
  }),
  act(3, {
    id: 'legends-kiosk-act-3',
    actTitle: 'Closing Time',
    blurb: 'Shutter\'s coming down. First to two gets the last Fan Milk.',
    objective: 'First to 2 before the shutter comes down',
    introLines: [
      'First to 2 · 16 flicks each',
      'Rattle the dish and still score for OFF THE DISH',
      'Esi is sharper tonight',
    ],
    rules: { goalsToWin: 2, flickLimit: 16, threeStarFlicks: 9 },
    opponent: { ...ESI, difficulty: 'medium' },
  }),
];
