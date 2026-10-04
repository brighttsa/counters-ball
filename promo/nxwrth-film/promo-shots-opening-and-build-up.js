// Shots from black to the producer tag: the object, the game reimagined, and
// the tightening run-in. NXWRTH's cap is not on any table here.
//
// Each shot: { id, start, end, take, cam(local, w) } plus optional
//   from/speed  where in the take it starts and how fast it runs
//   sync        pins one recorded impact to an edit mark (see takeTime)
//   freeze      film time at which the take stops while the shot holds
//   pose        extra hand animation on top of the recorded take
// `w` exposes the posed world: cap(i), ball(), sim (take seconds), stage, finger().
import { MARK, BEAT } from './nxwrth-promo-timeline-config.js';
import { mix3, add3, lerp, smooth, easeOut, span } from './promo-camera-and-motion-helpers.js';
import { RED_HERO } from './promo-venue-stages-and-hero-caps.js';
import { HELD_FLICK_AT } from './promo-take-layouts-and-flicks.js';
import { CAP_RADIUS } from '../../src/core/pitch-dimensions-and-constants.js';

const MACRO = { aperture: 0.16, sharpZone: 0.012, maxBlur: 0.02 };
const CLOSE = { aperture: 0.05, sharpZone: 0.04, maxBlur: 0.016 };
const WIDE = { aperture: 0.008, sharpZone: 0.9, maxBlur: 0.01 };

/** A dropped cap rattling flat: the tilt circles its rim, quickening as it dies. */
function settleWobble(w, index, seconds) {
  const cap = w.stage.caps[index];
  const tilt = 0.2 * Math.exp(-seconds * 4.2) * (seconds < 1.6 ? 1 : 0);
  const around = 11 * seconds + 9 * seconds * seconds;
  cap.pivot.rotation.set(tilt * Math.cos(around), 0, tilt * Math.sin(around));
  cap.pivot.position.y = Math.abs(Math.sin(tilt)) * CAP_RADIUS;
}

/** The pull before a flick: a finger's shadow arrives, the cap is drawn back and trembles under tension. */
export function pullBackAndHold(w, index, direction = 1) {
  const untilRelease = HELD_FLICK_AT - w.sim;
  if (untilRelease <= 0) { w.finger(0, 0, 0, direction); return; }
  const cap = w.stage.caps[index];
  const arrive = smooth(span(untilRelease, 1.45, 1.0));
  const pulled = smooth(span(untilRelease, 0.95, 0.3));
  const tremble = Math.sin(w.sim * 96) * 0.0009 * pulled * span(untilRelease, 0.5, 0.05);
  cap.pivot.position.x -= direction * (0.045 * pulled + tremble);
  w.finger(cap.pivot.position.x + direction * (0.01 - (1 - arrive) * 0.5), cap.pivot.position.z, arrive, direction); // the fingertip rests on the cap's rear half
}

const rush = (k) => MARK.rush + k * BEAT / 2;

export const OPENING_SHOTS = [
  { // The object. Painted metal, a crimped rim, one bulb.
    id: 'macro-rim', start: MARK.open, end: MARK.pullBack, take: 'opening', from: 0, speed: 0,
    pose(local, w) { settleWobble(w, RED_HERO, Math.max(0, local - MARK.macroLight)); },
    cam(local, w) {
      const cap = w.cap(RED_HERO), u = smooth(local / 1.95);
      return { pos: add3(cap, mix3([-0.13, 0.1, -0.21], [-0.21, 0.075, -0.13], u)), look: add3(cap, [0.01, 0.01, 0]),
        fov: 22, focusAt: add3(cap, [-0.04, 0.024, -0.04]), ...MACRO };
    },
  },
  { // Behind the cap. The shadow of a finger; the pull; the release.
    id: 'pull-and-release', start: MARK.pullBack, end: MARK.konk, take: 'opening',
    sync: { event: 'cap', at: MARK.konk },
    pose(local, w) { pullBackAndHold(w, RED_HERO); },
    cam(local, w) {
      const cap = w.cap(RED_HERO), u = local / (MARK.konk - MARK.pullBack);
      const rack = smooth(span(local, 0.15, 0.7));
      return { pos: [-0.68 + 0.07 * u, 0.058, 0.2], look: [0.2, 0.012, 0.12], fov: 27,
        focusAt: mix3([0.25, 0.012, 0.12], cap, rack), ...CLOSE };
    },
  },
  { // KONK. Daylight, the beat, the struck cap carrying into the ball.
    id: 'konk-match-cut', start: MARK.konk, end: MARK.overhead, take: 'konkMatch',
    sync: { event: 'cap', at: MARK.konk + 0.02, after: 0.42 },
    cam(local, w) {
      const struck = w.cap(8), u = easeOut(local / 1.55);
      return { pos: [lerp(-0.12, 0.2, u), 0.055, 0.56], look: mix3([0, 0.015, 0.1], struck, 0.7), fov: lerp(30, 26, u),
        focusAt: struck, ...CLOSE };
    },
  },
  { // The tactical geometry of the whole table.
    id: 'overhead-geometry', start: MARK.overhead, end: MARK.goalmouth, take: 'overheadPlay', from: 0,
    cam(local) {
      const u = local / 1.55;
      return { pos: [0.08, lerp(3.5, 3.15, easeOut(u)), 0.01], look: [0.08, 0, 0], up: [0, 0, -1], roll: lerp(-0.07, 0.03, u),
        fov: 36, ...WIDE };
    },
  },
  { // From behind the goal: the ball rattles the woodwork.
    id: 'goalmouth-post', start: MARK.goalmouth, end: MARK.bornInGhana, take: 'postRattle',
    sync: { event: 'post', at: MARK.goalmouth + BEAT * 1.5, after: 0.5 },
    cam(local, w) {
      const ball = w.ball();
      return { pos: [1.54, 0.06, 0.66 - 0.05 * local], look: mix3([1.05, 0.04, 0.12], ball, 0.5), fov: 36, focusAt: ball, ...CLOSE };
    },
  },
  { // Golden hour on the veranda: an unhurried orbit of three caps and a paper ball.
    id: 'golden-orbit', start: MARK.bornInGhana, end: MARK.look, take: 'orbit', from: 0, speed: 0,
    cam(local, w) {
      const angle = 2.2 + local * 0.36, cap = w.cap(RED_HERO);
      return { pos: [0.08 + Math.cos(angle) * 0.64, 0.115 + local * 0.02, Math.sin(angle) * 0.64], look: [0.08, 0.02, 0],
        fov: 26, focusAt: cap, ...CLOSE };
    },
  },
  { // A LOOK: straight down the lens at a spinning face.
    id: 'spinning-face', start: MARK.look, end: MARK.feel, take: 'orbit', from: 0, speed: 0,
    pose(local, w) { w.stage.caps[RED_HERO].mesh.rotation.y += 7 * local - 3.2 * local * local; },
    cam(local, w) {
      const cap = w.cap(RED_HERO);
      return { pos: add3(cap, [0.09, 0.3, 0.15]), look: cap, fov: lerp(31, 22, easeOut(span(local, 0, 0.16))), focusAt: cap, ...MACRO };
    },
  },
  { // A FEEL: metal into metal, slowed until the hit can be felt.
    id: 'slow-impact', start: MARK.feel, end: MARK.rush, take: 'feelImpact',
    sync: { event: 'cap', at: MARK.feel + 0.3, after: 0.14 },
    cam(local, w) {
      return { pos: [-0.12 + 0.03 * local, 0.036, 0.4], look: [0.0, 0.016, 0.02], fov: 22, focusAt: w.cap(7), ...MACRO };
    },
  },
  // The run-in: half-beat cuts, each closer than the last.
  { id: 'rush-rim', start: rush(0), end: rush(1), take: 'opening', from: 0, speed: 0,
    cam(local, w) {
      const cap = w.cap(RED_HERO);
      return { pos: add3(cap, [0.14 - local * 0.2, 0.085, -0.2]), look: add3(cap, [0, 0.012, 0]), fov: 17, focusAt: cap, ...MACRO };
    } },
  { id: 'rush-overhead', start: rush(1), end: rush(2), take: 'overheadPlay', from: 0.45,
    cam(local, w) {
      const ball = w.ball();
      return { pos: [ball[0], 1.5 - local * 1.6, ball[2] + 0.01], look: ball, up: [0, 0, -1], roll: 0.3, fov: 24, ...WIDE };
    } },
  { id: 'rush-slide-past', start: rush(2), end: rush(3), take: 'slide', from: 0.02,
    cam(local, w) {
      return { pos: [-0.28, 0.03, 0.11], look: [-0.9, 0.02, -0.02], fov: 30, focusAt: w.cap(RED_HERO), ...CLOSE };
    } },
  { id: 'rush-tension', start: rush(3), end: rush(4), take: 'opening', from: HELD_FLICK_AT - 0.42,
    pose(local, w) { pullBackAndHold(w, RED_HERO); },
    cam(local, w) {
      const cap = w.cap(RED_HERO);
      return { pos: add3(cap, [0.02, 0.07, 0.25 - local * 0.2]), look: add3(cap, [0, 0.012, 0]), fov: 18, focusAt: cap, ...MACRO };
    } },
  { id: 'rush-goal', start: rush(4), end: rush(5), take: 'goalIn',
    sync: { event: 'goal', at: rush(5) - 0.03 },
    cam(local, w) {
      const ball = w.ball();
      return { pos: [1.6, 0.05, -0.1], look: ball, fov: 36 - local * 40, focusAt: ball, ...CLOSE };
    } },
  { // The last frame before the name: a cap at the lens. It holds while the voice speaks.
    id: 'rush-at-lens', start: rush(5), end: MARK.drop, freeze: MARK.tag, take: 'atLens', from: 0.03,
    cam(local, w) {
      const cap = w.cap(RED_HERO);
      return { pos: [0.2, 0.045, 0.012], look: mix3([-0.3, 0.014, 0], cap, 0.6), fov: 24, focusAt: cap, ...CLOSE };
    } },
];
