// Small pure helpers the shots share: easing, vector blends, impact shake and
// the mapping between a shot's local time and its recorded take.
import * as THREE from 'three';

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const smooth = (t) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeIn = (t) => Math.pow(clamp01(t), 3);
/** A flicked object: fast away, friction brings it to rest. */
export const slideOut = (t) => 1 - Math.pow(1 - clamp01(t), 5);
/** Arrives past its mark and settles back onto it, like a cap knocked into place. */
export const slam = (t) => { const x = clamp01(t); return 1 + Math.sin(x * Math.PI) * 0.08 * (1 - x) - Math.pow(1 - x, 4); };
/** 0→1 over [a, b]. */
export const span = (t, a, b) => clamp01((t - a) / (b - a));

/** A flick velocity from one point through another. */
export function aim(from, through, speed) {
  const dx = through[0] - from[0], dz = through[1] - from[1], d = Math.hypot(dx, dz) || 1;
  return [(dx / d) * speed, (dz / d) * speed];
}

/**
 * Take seconds for a shot's local time. A synced shot pins one recorded impact
 * to a mark in the edit and can run at different speeds either side of it.
 */
export function takeTime(shot, take, local) {
  if (!shot.sync) return (shot.from ?? 0) + local * (shot.speed ?? 1);
  const hit = take.events.filter((event) => event.kind === shot.sync.event)[shot.sync.n ?? 0];
  const d = local - (shot.sync.at - shot.start);
  return (hit?.t ?? 0) + d * (d < 0 ? shot.sync.before ?? 1 : shot.sync.after ?? 1);
}

/** Film time at which a take event is seen in a shot, or null when it falls outside the shot. */
export function eventFilmTime(shot, take, event) {
  let local;
  if (!shot.sync) local = (event.t - (shot.from ?? 0)) / (shot.speed ?? 1);
  else {
    const hit = take.events.filter((e) => e.kind === shot.sync.event)[shot.sync.n ?? 0];
    const d = event.t - (hit?.t ?? 0);
    local = shot.sync.at - shot.start + d / (d < 0 ? shot.sync.before ?? 1 : shot.sync.after ?? 1);
  }
  const film = shot.start + local;
  const limit = shot.freeze ?? shot.end;
  return film >= shot.start - 1e-6 && film < limit ? film : null;
}

const shakeOffset = new THREE.Vector3();
/**
 * Camera shake from the impacts the viewer has just seen: trauma decays from
 * each one, and the motion is smooth summed sines, never random jitter.
 * @param impacts [{ t: filmSeconds, strength }]
 */
export function impactShake(filmTime, impacts, scale = 1) {
  let trauma = 0;
  for (const impact of impacts) {
    const age = filmTime - impact.t;
    if (age >= 0 && age < 0.6) trauma += impact.strength * Math.exp(-age * 9);
  }
  const amount = Math.min(1, trauma) ** 2 * 0.012 * scale;
  const t = filmTime * 60;
  return shakeOffset.set(
    (Math.sin(t * 1.31) + Math.sin(t * 2.17 + 1.3)) * amount,
    (Math.sin(t * 1.73 + 0.6) + Math.sin(t * 2.63 + 2.1)) * amount,
    (Math.sin(t * 1.11 + 4.0) + Math.sin(t * 2.91 + 0.4)) * amount * 0.5);
}

const COMPOSED_ASPECT = 16 / 9;
const WIDEST_FOV = 88;
const widen = (fov, factor) => THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * factor));

const lookTarget = new THREE.Vector3();
/**
 * Applies a shot's framing: { pos, look, fov, roll, up }. Shots are composed for 16:9.
 * In a narrower frame the lens widens so the same width of table stays in shot, and a
 * top-down shot is turned a quarter so the pitch runs up the frame, as the game does on a phone.
 */
export function applyCamera(camera, frame, shake) {
  camera.up.set(...(frame.up ?? [0, 1, 0]));
  camera.position.set(...frame.pos);
  if (shake) camera.position.add(shake);
  camera.lookAt(lookTarget.set(...frame.look));
  const narrower = COMPOSED_ASPECT / camera.aspect;
  const turned = frame.up && camera.aspect < 1;
  if (frame.roll || turned) camera.rotateZ((frame.roll ?? 0) + (turned ? Math.PI / 2 : 0));
  const fov = turned ? widen(frame.fov, COMPOSED_ASPECT) : narrower > 1 ? Math.min(WIDEST_FOV, widen(frame.fov, narrower)) : frame.fov;
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  return camera.position.distanceTo(lookTarget);
}
