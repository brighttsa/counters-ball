// Shots from the drop to the cut to black: NXWRTH's cap under the bulb, the
// game at full confidence, then one cap, one flick, and the question.
// Shot fields are described in promo-shots-opening-and-build-up.js.
import { MARK, BEAT } from './nxwrth-promo-timeline-config.js';
import { mix3, add3, lerp, smooth, easeOut, span } from './promo-camera-and-motion-helpers.js';
import { NXWRTH_CAP } from './promo-venue-stages-and-hero-caps.js';
import { pullBackAndHold } from './promo-shots-opening-and-build-up.js';

const MACRO = { aperture: 0.15, sharpZone: 0.02, maxBlur: 0.02 };
const CLOSE = { aperture: 0.05, sharpZone: 0.04, maxBlur: 0.016 };
const WIDE = { aperture: 0.008, sharpZone: 0.9, maxBlur: 0.01 };

/** Yaw that sets the printed name upright for a camera standing on the +x side of the cap. */
const NAME_UPRIGHT_FROM_PLUS_X = Math.PI;

/** Turns the NXWRTH cap so its print reads upright from `cameraPosition`, plus `extra` radians of spin. */
function faceNameTo(w, cameraPosition, extra = 0) {
  const cap = w.stage.caps[NXWRTH_CAP], at = cap.pivot.position;
  const bearing = Math.atan2(cameraPosition[2] - at.z, cameraPosition[0] - at.x);
  cap.mesh.rotation.y = NAME_UPRIGHT_FROM_PLUS_X - bearing + extra;
}

/** Where the finale's close-up reads the cap from. */
const FINALE_READER = [1.0, 0, 0.3];

const signatureCamera = (local, w) => {
  const cap = w.cap(NXWRTH_CAP);
  const boom = smooth(span(local, 0.75, 1.75)), run = easeOut(span(local, 0, 0.95));
  const low = [lerp(1.15, cap[0] + 0.42, run), 0.03, cap[2] + 0.07];
  const high = add3(cap, [0.2, 0.25 - 0.03 * span(local, 1.75, 3.1), 0.03]);
  return mix3(low, high, boom);
};

export const REVEAL_SHOTS = [
  { // The signature shot. Low across the desk, the cap comes at the lens spinning,
    // and as the spin dies the camera rises to read what is printed on it.
    id: 'nxwrth-cap', start: MARK.drop, end: MARK.capCollision, take: 'nxwrthRun',
    sync: { event: 'cap', at: MARK.capCollision },
    pose(local, w) { faceNameTo(w, signatureCamera(local, w), 17 * Math.exp(-1.7 * local)); },
    cam(local, w) {
      const cap = w.cap(NXWRTH_CAP), boom = smooth(span(local, 0.75, 1.75));
      return { pos: signatureCamera(local, w), look: add3(cap, [0, 0.012, 0]), fov: lerp(31, 24, boom), focusAt: cap,
        aperture: lerp(0.05, 0.15, boom), sharpZone: lerp(0.05, 0.03, boom), maxBlur: 0.02 };
    },
  },
  { // KONK: the collision cuts straight into a strike from distance.
    id: 'long-range-goal', start: MARK.capCollision, end: MARK.hasASound, take: 'longGoal',
    sync: { event: 'ball', at: MARK.capCollision + 0.03, after: 0.5 },
    cam(local, w) {
      const ball = w.ball();
      return { pos: [ball[0] - 0.5, 0.11 + local * 0.03, ball[2] + 0.34], look: add3(ball, [0.35, 0, -0.05]), fov: 34, focusAt: ball, ...CLOSE };
    },
  },
  { // The table as a tactics board; the frame stops and the play is drawn on it.
    id: 'tactics-freeze', start: MARK.hasASound, end: MARK.goalRun, freeze: MARK.hasASound + BEAT * 1.6, take: 'tactics', from: 0, speed: 0.6,
    cam(local) {
      return { pos: [-0.5 + local * 0.12, 2.55, 1.35], look: [0.3, 0, -0.05], fov: 33, ...WIDE };
    },
  },
  { // Alongside the ball, low, as it runs into the goal.
    id: 'goal-run-alongside', start: MARK.goalRun, end: MARK.oneCap, take: 'goalIn',
    sync: { event: 'goal', at: MARK.goalRun + BEAT * 2, before: 0.6, after: 0.3 },
    cam(local, w) {
      const ball = w.ball();
      return { pos: [Math.min(1.38, ball[0] + 0.3), 0.05, ball[2] - 0.42], look: add3(ball, [0.08, 0.01, 0]), fov: 34, focusAt: ball, ...CLOSE };
    },
  },
  { // ONE CAP.
    id: 'one-cap', start: MARK.oneCap, end: MARK.oneFlick, take: 'finale', from: 0, speed: 0,
    pose(local, w) { faceNameTo(w, FINALE_READER); },
    cam(local, w) {
      const cap = w.cap(NXWRTH_CAP), u = local / 1.55;
      return { pos: add3(cap, mix3([0.13, 0.22, 0.1], [0.1, 0.17, 0.075], smooth(u))), look: add3(cap, [0, 0.01, 0]), fov: 22,
        focusAt: cap, ...MACRO };
    },
  },
  { // ONE FLICK.
    id: 'one-flick', start: MARK.oneFlick, end: MARK.whosNext, take: 'finale',
    sync: { event: 'ball', at: MARK.oneFlick + BEAT * 3, after: 0.16 },
    pose(local, w) { faceNameTo(w, FINALE_READER); pullBackAndHold(w, NXWRTH_CAP, -1); },
    cam(local, w) {
      const cap = w.cap(NXWRTH_CAP);
      return { pos: [1.06 - 0.05 * local, 0.085, -0.06], look: [0.1, 0.014, 0.04], fov: 27, focusAt: cap, ...CLOSE };
    },
  },
  { // WHO'S GOT NEXT? The ball comes down the table and into the lens.
    id: 'whos-got-next', start: MARK.whosNext, end: MARK.black, take: 'finale',
    sync: { event: 'ball', at: MARK.oneFlick + BEAT * 3, after: 0.16 },
    cam(local, w) {
      const ball = w.ball();
      return { pos: [-1.32, 0.036, 0.05], look: mix3([-0.6, 0.03, 0.04], ball, 0.85), fov: 30, focusAt: ball, fill: 0.45, ...CLOSE };
    },
  },
  { id: 'end-card', start: MARK.black, end: Infinity, take: null },
];
