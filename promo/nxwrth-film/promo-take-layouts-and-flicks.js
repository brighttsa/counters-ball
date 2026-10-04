// Where the caps and ball stand for each recorded take, and which caps are
// flicked when. Positions are table coordinates (x along the pitch, z across).
import { aim } from './promo-camera-and-motion-helpers.js';
import { RED_HERO, NXWRTH_CAP } from './promo-venue-stages-and-hero-caps.js';

const HOME = [[-1.32, 0], [-0.88, -0.5], [-0.88, 0.5], [-0.42, -0.26], [-0.42, 0.26]];
const formation = (shift = {}) => Object.fromEntries([
  ...HOME.map(([x, z], i) => [i, shift[i] ?? [x, z]]),
  ...HOME.map(([x, z], i) => [i + 5, shift[i + 5] ?? [-x, z]]),
]);

/** The flick in a take that opens on a still table; shots show the wait before it. */
export const HELD_FLICK_AT = 4;

export const TAKES = {
  // Jamestown, one bulb. The red cap is pulled back and let go.
  opening: {
    stage: 'night', duration: 6, ball: [0.74, -0.22],
    caps: { [RED_HERO]: [-0.3, 0.12], 6: [0.25, 0.12], 7: [0.95, -0.38], 8: [1.12, 0.5] },
    flicks: [{ t: HELD_FLICK_AT, cap: RED_HERO, v: [3.3, 0] }],
  },
  atLens: {
    stage: 'night', duration: 2, ball: null,
    caps: { [RED_HERO]: [-0.62, 0.0], 6: [-1.2, 0.5], 7: [-1.1, -0.45] },
    flicks: [{ t: 0, cap: RED_HERO, v: [3.4, 0] }],
  },
  // The NXWRTH cap slides in and settles under the bulb; a red cap answers it.
  nxwrthRun: {
    stage: 'night', duration: 5, ball: [0.92, -0.5],
    caps: { [NXWRTH_CAP]: [-1.28, -0.05], [RED_HERO]: [1.3, 0.34], 6: [-0.3, 0.66], 7: [0.1, -0.74] },
    flicks: [{ t: 0, cap: NXWRTH_CAP, v: [3.4, 0] }, { t: 2.78, cap: RED_HERO, at: NXWRTH_CAP, speed: 3.4 }],
  },
  finale: {
    stage: 'night', duration: 7, ball: [0.12, 0.04],
    caps: { [NXWRTH_CAP]: [0.66, 0.04], 6: [-0.5, -0.5], 7: [-0.9, 0.5], [RED_HERO]: [1.15, -0.5] },
    flicks: [{ t: HELD_FLICK_AT, cap: NXWRTH_CAP, at: 'ball', speed: 3.4 }],
  },

  // The kiosk, late afternoon.
  konkMatch: {
    stage: 'day', duration: 4, ball: [0.46, 0.15],
    caps: formation({ 3: [-0.52, 0.1], 4: [-0.3, 0.64], 8: [0.0, 0.1] }),
    flicks: [{ t: 0.3, cap: 3, v: [3.4, 0] }],
  },
  overheadPlay: {
    stage: 'day', duration: 4, ball: [0, 0],
    caps: formation(),
    flicks: [{ t: 0.15, cap: 4, at: 'ball', speed: 3.1 }, { t: 1.0, cap: 8, at: 'ball', speed: 3.2 }],
  },
  postRattle: {
    stage: 'day', duration: 4, ball: [0.75, 0.05],
    caps: { 3: [0.317, -0.071], 5: [1.3, -0.1], 6: [0.9, -0.55], 1: [-0.2, 0.4] },
    flicks: [{ t: 0.3, cap: 3, v: aim([0.317, -0.071], [0.75, 0.05], 3.3) }],
  },
  feelImpact: {
    stage: 'day', duration: 3, ball: [0.62, 0.2],
    caps: { 2: [-0.45, 0.0], 7: [0.08, 0.025], 9: [0.9, -0.4] },
    flicks: [{ t: 0.3, cap: 2, v: [3.4, 0.06] }],
  },
  tactics: {
    stage: 'day', duration: 4, ball: [0.28, -0.1],
    caps: formation({ 3: [-0.16, -0.3] }),
    flicks: [{ t: 0.2, cap: 3, at: 'ball', speed: 3.3 }],
  },

  // The veranda, golden hour.
  orbit: {
    stage: 'gold', duration: 1, ball: [0.12, 0.2],
    caps: { [RED_HERO]: [0, 0.04], 6: [0.26, -0.1], 8: [-0.22, -0.26], 1: [-0.7, 0.5], 9: [0.8, 0.45] },
  },
  slide: {
    stage: 'gold', duration: 2, ball: null,
    caps: { [RED_HERO]: [-0.7, 0.0], 6: [0.9, 0.5] },
    flicks: [{ t: 0, cap: RED_HERO, v: [3.2, 0.12] }],
  },
  longGoal: {
    stage: 'gold', duration: 4, ball: [-0.3, 0.28],
    caps: { [RED_HERO]: [-0.745, 0.349], 0: [-1.32, 0], 5: [1.32, 0.36], 6: [0.6, -0.55], 7: [0.25, 0.72] },
    flicks: [{ t: 0.3, cap: RED_HERO, at: 'ball', speed: 3.4 }],
  },
  goalIn: {
    stage: 'gold', duration: 4, ball: [0.72, 0.1],
    caps: { 4: [0.3, 0.135], 5: [1.34, -0.4], 6: [0.9, 0.6] },
    flicks: [{ t: 0.3, cap: 4, at: 'ball', speed: 3.3 }],
  },
};
