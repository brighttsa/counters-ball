export const DEFAULT_TAG_TIME = 12;
export const DEFAULT_FILM_LENGTH = 27;
export const REVEAL_HOLD = 0.7;

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const smooth = (n) => { n = clamp(n, 0, 1); return n * n * (3 - 2 * n); };

export function timelineTextAt(time, duration, tagTime) {
  const tag = tagTime !== null && tagTime !== '' && Number.isFinite(Number(tagTime)) ? Number(tagTime) : Infinity;
  const reveal = tagTime !== null && tagTime !== '' && Number.isFinite(tag) && tag >= 0 && time >= tag;
  if (reveal && time - tag < 2.3) return { text: 'NXWRTH', sub: '× KONK!', reveal: true, impact: true };
  if (time >= duration - 1.8 && time < duration - 1.45) return { text: '', sub: '', reveal, blackout: true };
  if (time >= duration - 1.45) return { text: 'KONK!', sub: reveal ? 'NXWRTH ON THE SOUNDTRACK · GHANA TO THE WORLD · KONK.WORLD' : 'GHANA TO THE WORLD · KONK.WORLD', reveal, blackout: true };
  if (time >= duration - 3.8) return { text: "WHO'S GOT NEXT?", sub: '', reveal };
  if (time >= duration - 5.7) return { text: 'ONE FLICK.', sub: '', reveal };
  if (time >= duration - 7.5) return { text: 'ONE CAP.', sub: '', reveal };
  if (!reveal) {
    if (time >= tag - 1.05) return { text: 'THE GAME HAS A FEEL.', sub: '', reveal: false };
    if (time >= 9.8) return { text: 'THE GAME HAS A LOOK.', sub: '', reveal: false };
    if (time >= 7.7) return { text: 'BORN IN GHANA.', sub: '', reveal: false };
    if (time >= 5.5) return { text: 'REIMAGINED.', sub: '', reveal: false };
    if (time >= 3.4) return { text: 'COUNTERS BALL.', sub: '', reveal: false };
    return { text: '', sub: '', reveal: false };
  }
  const afterTag = time - tag;
  if (afterTag < 5.8) return { text: 'KONK! HAS A SOUND.', sub: '', reveal: true };
  if (afterTag < 9.2) return { text: 'NXWRTH ON THE SOUNDTRACK.', sub: '', reveal: true };
  return { text: '', sub: '', reveal: true };
}

export function cameraCueAt(time, tagTime, aspect = 16 / 9) {
  const t = Math.max(0, time), tag = tagTime === null || tagTime === '' ? NaN : Number(tagTime);
  const shots = [
    { at: 0, p: [-0.4, 0.32, 0.58], target: [-0.58, 0.025, -0.05], fov: 34 },
    { at: 3.4, p: [0.48, 0.2, 0.62], target: [0.15, 0.03, 0], fov: 42 },
    { at: 5.5, p: [3.5, 2.7, 3.9], target: [0, 0.18, 0], fov: 44 },
    { at: 7.7, p: [-3.2, 2.3, -3.5], target: [0, 0.1, 0], fov: 43 },
    { at: 9.8, p: [0.1, 4.9, 0.08], target: [0, 0, 0], fov: 48 },
    { at: Number.isFinite(tag) ? tag - 1.05 : 10.95, p: [-0.24, 0.68, 1.48], target: [0, 0.04, 0], fov: 34 },
    { at: Number.isFinite(tag) ? tag : 12, p: [0.18, 0.72, 1.62], target: [0, 0.04, 0], fov: 31, punch: true },
    { at: Number.isFinite(tag) ? tag + 2.3 : 14.3, p: [-3.7, 1.7, 2.4], target: [0, 0.1, 0], fov: 42 },
    { at: Number.isFinite(tag) ? tag + 5.8 : 17.8, p: [0.08, 4.8, 0.06], target: [0, 0, 0], fov: 47 },
    { at: Number.isFinite(tag) ? tag + 9.2 : 21.2, p: [1.9, 0.42, 2.6], target: [1.32, 0.12, 0], fov: 39 },
    { at: Number.isFinite(tag) ? tag + 13.2 : 25.2, p: [-2.1, 1.2, -2.8], target: [0, 0.1, 0], fov: 40 },
    { at: Number.isFinite(tag) ? tag + 17.2 : 29.2, p: [0.05, 4.6, 0.04], target: [0, 0, 0], fov: 48 },
  ].sort((a, b) => a.at - b.at);
  let index = shots.findIndex((shot) => shot.at > t) - 1;
  if (index < 0) index = 0;
  const a = shots[index], b = shots[index + 1] ?? a;
  const blend = smooth((t - a.at) / Math.max(0.001, b.at - a.at));
  const lerp = (x, y) => x + (y - x) * blend;
  const position = a.p.map((v, i) => lerp(v, b.p[i]));
  const target = a.target.map((v, i) => lerp(v, b.target[i]));
  const portrait = aspect < 0.8;
  if (portrait && t > 3.3) position[1] = Math.max(position[1], 4.2);
  return { position, target, fov: lerp(a.fov, b.fov), punch: Number.isFinite(tag) && Math.abs(t - tag) < 0.12 };
}

export function capCueAt(time, tagTime) {
  const tag = tagTime === null || tagTime === '' ? NaN : Number(tagTime), reveal = Number.isFinite(tag) && time >= tag;
  const flick = clamp((time - 2.35) / 1.25, 0, 1);
  const travel = smooth(flick);
  const spin = time < 2.35 ? 0 : Math.min(12, (time - 2.35) * 9);
  return { x: -0.58 + travel * 0.9, z: -0.05 + travel * 0.09,
    rotation: spin, reveal, heroSpin: reveal ? (time - tag) * 12 : 0 };
}

export function ballCueAt(time) {
  const play = Math.max(0, Math.min(1, (time - 3.45) / 1.1));
  const goal = Math.max(0, Math.min(1, (time - 8.7) / 1.2));
  const ease = (n) => n * n * (3 - 2 * n);
  const x = time < 8.7 ? ease(play) * 0.82 : 0.82 + ease(goal) * 0.58;
  const z = time < 8.7 ? Math.sin(play * Math.PI) * 0.28 : 0.28 * (1 - ease(goal));
  return { x, z, spin: Math.max(0, time - 3.45) * 18, y: 0.035 + (time > 3.45 && time < 4.55 ? Math.sin(play * Math.PI) * 0.1 : 0) };
}

export function shouldReveal(tagTime, audioTime, sectionStart = 0) {
  return tagTime !== null && tagTime !== '' && Number.isFinite(Number(tagTime)) && Number.isFinite(audioTime)
    && Number(tagTime) >= sectionStart && audioTime + 1e-4 >= Number(tagTime);
}
