// Street Legends — Lights Out Final, Jamestown, under the kiosk bulb.
// Layered on the real campaign venue (same name, place, rival, team); the
// classic campaign match here is unchanged.
//
// Both goals are padlocked. Strike your three coin stacks in beam order (ball
// or your own cap) to light the bulb and drop the padlock, then score.
//   1 DISCOVER  Solo. Magic's keeper stands still; light the chain, then score.
//   2 MASTER    Magic plays, and he lights his chain two turns ahead.
//   3 SHOWDOWN  First to two: the bulb goes out after every goal.
import { CAMPAIGN_LEVELS } from './campaign-level-definitions.js';

const NIGHTBULB = CAMPAIGN_LEVELS.find((level) => level.id === 'nightbulb');

// Magic plans the chain ahead: strong setup habits, careful defence.
const MAGIC = { ...NIGHTBULB.opponent, tactics: { block: 1, setup: 2, caution: 1.2 } };
const COIN_STACK_CHAIN = { type: 'coin-stack-chain' };

const act = (number, overrides) => ({
  ...NIGHTBULB,
  mode: 'legends',
  mechanic: COIN_STACK_CHAIN,
  obstacles: [], // the coin stacks are the obstacles here
  tutorial: false,
  legend: { venue: NIGHTBULB.name, act: number, acts: 3 },
  ...overrides,
});

export const LIGHTS_OUT_COIN_STACK_ACTS = [
  act(1, {
    id: 'legends-nightbulb-act-1',
    actTitle: 'Light the Bulb',
    blurb: 'Magic padlocked his goal. Light three coin stacks in the beam to open it.',
    objective: 'Light all three stacks, then score',
    introLines: [
      'Solo challenge · light the chain and score in 14 flicks',
      'Strike the stack in the beam with the ball or your own cap',
      'Three stacks lit: LIGHTS ON, the padlock drops',
      'Light the last stack and score on the same flick for the hero goal',
    ],
    rules: { goalsToWin: 1, flickLimit: 14, awayFlickLimit: 0, threeStarFlicks: 7 },
    awaySlots: [0],
    ballStart: [0.85, 0], // between stacks two and three: one strike can light both
    opponent: { ...MAGIC, difficulty: 'easy' },
  }),
  act(2, {
    id: 'legends-nightbulb-act-2',
    actTitle: "Magic's Table",
    blurb: 'Magic hasn\'t lost under this bulb. His first stack is already lined up.',
    objective: 'Light your chain before Magic lights his',
    introLines: [
      'First to 1 · 20 flicks each · both goals padlocked',
      'The white beam is yours, the gold beam is Magic\'s',
      "Don't leave the ball beside his next stack",
    ],
    rules: { goalsToWin: 1, flickLimit: 20, threeStarFlicks: 10 },
    opponent: { ...MAGIC, difficulty: 'easy' },
  }),
  act(3, {
    id: 'legends-nightbulb-act-3',
    actTitle: 'Lights Out',
    blurb: 'Jamestown is at the kiosk. First to two; the bulb resets after every goal.',
    objective: 'First to 2 · relight the chain after every goal',
    introLines: [
      'First to 2 · 24 flicks each',
      'Score and your bulb goes out: light all three again',
      'Magic plans his chain two turns ahead: keep the ball off his stacks',
    ],
    rules: { goalsToWin: 2, flickLimit: 24, threeStarFlicks: 14 },
    opponent: { ...MAGIC, difficulty: 'easy' },
  }),
];
