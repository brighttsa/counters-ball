// What is written on the film, and when. Copy comes from the approved pool; the end line is the owner's.
// Positions are fractions of the title-safe box (16:9-shaped, centred), so the
// same cues hold in 9:16 and 1:1 without cropping a word.
//
// NXWRTH's name first appears at TAG + REVEAL_LAG and nowhere earlier.
import { MARK, TAG, DROP, REVEAL_LAG, BEAT, INK, intro } from './nxwrth-promo-timeline-config.js';

const LOWER_LEFT = { at: [0.06, 0.8], align: 'left' };
const LOWER_CENTRE = { at: [0.5, 0.8], align: 'center' };

export const GRAPHIC_CUES = [
  { kind: 'black', t: 0, end: MARK.macroLight + 1.1, fadeFrom: MARK.macroLight },
  { kind: 'flash', t: MARK.konk, dur: 0.12, alpha: 0.5 },

  { kind: 'title', text: 'COUNTERS BALL.', font: 'chalk', size: 150, ...LOWER_LEFT, wear: 1.6,
    t: intro(0, 2), end: MARK.reimagined + 0.2, strikeAt: MARK.reimagined }, // struck out, then painted over
  { kind: 'title', text: 'REIMAGINED.', size: 215, at: [0.05, 0.8], align: 'left', rot: -0.035, swipe: INK.enamel, hit: 0.3,
    t: MARK.reimagined + 0.04, end: MARK.goalmouth + BEAT, exit: 'flick' },

  { kind: 'title', text: 'BORN IN GHANA.', size: 170, ...LOWER_LEFT, underline: INK.gold, ticks: true, hit: 0.25,
    t: MARK.bornInGhana + 0.03, end: MARK.look },

  { kind: 'title', text: 'THE GAME HAS A LOOK.', size: 112, ...LOWER_CENTRE, t: MARK.look, end: MARK.feel },
  { kind: 'title', text: 'THE GAME HAS A FEEL.', size: 112, ...LOWER_CENTRE, t: MARK.feel, end: MARK.rush },

  // "NORTH!!!" The music drops out, the picture holds, the voice names him, and only then the type.
  { kind: 'black', t: TAG, end: DROP, alpha: 0.9 },
  { kind: 'flash', t: TAG + REVEAL_LAG, dur: 0.1, alpha: 0.3 },
  { kind: 'title', text: 'NXWRTH', size: 400, fit: 0.9, at: [0.5, 0.5], align: 'center', wear: 0.8, hit: 0.5,
    t: TAG + REVEAL_LAG, end: DROP + 0.2, exit: 'flick' },
  { kind: 'spray', color: INK.chalk, size: 2300, at: [0.5, 0.5], t: DROP },
  { kind: 'spray', color: INK.gold, size: 1700, at: [0.52, 0.48], t: DROP },
  { kind: 'flash', t: DROP, dur: 0.14, alpha: 0.45 },

  { kind: 'title', text: 'NXWRTH  ×  KONK!', size: 150, ...LOWER_LEFT, underline: INK.gold, hit: 0.3,
    t: MARK.lockup, end: MARK.capCollision },
  { kind: 'flash', t: MARK.capCollision, dur: 0.1, alpha: 0.35 },

  { kind: 'title', text: 'KONK! HAS A SOUND.', size: 170, at: [0.08, 0.79], align: 'left', rot: -0.03, swipe: INK.enamel, hit: 0.3,
    t: MARK.hasASound, end: MARK.goalRun },
  { kind: 'tactics', t: MARK.hasASound + BEAT * 1.6, end: MARK.goalRun, goal: [1.5, 0.02, 0] },

  { kind: 'title', text: 'ONE CAP.', size: 250, ...LOWER_CENTRE, hit: 0.3, t: MARK.oneCap, end: MARK.oneFlick },
  { kind: 'title', text: 'ONE FLICK.', size: 250, ...LOWER_CENTRE, hit: 0.3, t: MARK.oneFlick, end: MARK.whosNext },
  { kind: 'title', text: 'WHO’S NEXT?', size: 250, ...LOWER_CENTRE, hit: 0.35, t: MARK.whosNext, end: MARK.black },

  { kind: 'black', t: MARK.black, end: Infinity },
  { kind: 'endCard', t: MARK.endCard, end: Infinity,
    lines: [
      { text: 'NXWRTH IS ON KONK!', size: 84, tracking: 0.06, color: INK.chalk, y: 0.64, delay: 0.5 },
      { text: 'GHANA TO THE WORLD.', size: 50, tracking: 0.12, color: INK.gold, y: 0.745, delay: 1.1 },
      { text: 'KONK.WORLD', size: 40, tracking: 0.2, color: INK.chalkDim, y: 0.9, delay: 1.7 },
    ] },
];

/** Hits the picture feels: each stamped title lands with a small knock of the camera. */
export const TITLE_IMPACTS = GRAPHIC_CUES.filter((cue) => cue.hit).map((cue) => ({ t: cue.t, strength: cue.hit }));
