// KONK!'s graphic kit, made from what is on the table: chalk, enamel paint,
// a marker, the ring a bottle cap leaves. Each primitive is painted once into
// a bitmap with seeded wear, so the film only moves finished artwork around.
import { createSeededRandom } from '../../src/core/seeded-random-number-generator.js';
import { INK } from './nxwrth-promo-timeline-config.js';

const makeCanvas = (width, height) => Object.assign(document.createElement('canvas'), { width: Math.ceil(width), height: Math.ceil(height) });

export const FONTS = {
  poster: (size) => `400 ${size}px Anton, Impact, sans-serif`,
  chalk: (size) => `700 ${size}px "Cabin Sketch", "Chalkboard SE", cursive`,
  hand: (size) => `400 ${size}px "Patrick Hand", "Chalkboard SE", cursive`,
};

export async function loadGraphicFonts() {
  await Promise.all(['400 64px Anton', '700 64px "Cabin Sketch"', '400 64px "Patrick Hand"'].map((font) => document.fonts.load(font, 'KONK! NXWRTH×')));
}

/** Wears a painted bitmap: dry-brush speckle and a few scratches bite through the ink. */
function distress(ctx, width, height, rng, amount) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const specks = Math.round((width * height) / 900 * amount);
  for (let i = 0; i < specks; i++) {
    ctx.globalAlpha = 0.3 + rng() * 0.7;
    ctx.beginPath();
    ctx.arc(rng() * width, rng() * height, 0.5 + rng() * rng() * 3.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 5 * amount; i++) {
    const x = rng() * width, y = rng() * height, a = (rng() - 0.5) * 0.7, len = width * (0.1 + rng() * 0.3);
    ctx.globalAlpha = 0.35 + rng() * 0.4;
    ctx.lineWidth = 0.6 + rng() * 1.8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
  }
  ctx.restore();
}

/** Poster faces draw a timid "×"; ours is two strokes of the same brush, as wide as a letter. */
function crossMarks(ctx, text, x, baseline, size, color) {
  for (let i = text.indexOf('×'); i >= 0; i = text.indexOf('×', i + 1)) {
    const left = x + ctx.measureText(text.slice(0, i)).width, width = ctx.measureText('×').width;
    const cx = left + width / 2, cy = baseline - size * 0.37, r = size * 0.2;
    ctx.clearRect(left, baseline - size, width, size * 1.1);
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = size * 0.11; ctx.lineCap = 'square'; ctx.letterSpacing = '0px';
    ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke();
    ctx.restore();
  }
}

/**
 * A line of lettering as worn ink.
 * @returns {{ canvas, width, height }} text sits inside `pad` px of margin
 */
export function inkText(text, { font = 'poster', size = 160, color = INK.chalk, wear = 1, tracking = 0, seed = 1 } = {}) {
  const probe = makeCanvas(4, 4).getContext('2d');
  probe.font = FONTS[font](size);
  probe.letterSpacing = `${tracking * size}px`;
  const metrics = probe.measureText(text);
  const pad = Math.ceil(size * 0.16);
  const width = metrics.width + pad * 2, height = size * 1.16 + pad * 2;
  const canvas = makeCanvas(width, height), ctx = canvas.getContext('2d');
  ctx.font = probe.font;
  ctx.letterSpacing = probe.letterSpacing;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(text, pad, pad + size * 0.98);
  crossMarks(ctx, text, pad, pad + size * 0.98, size, color);
  distress(ctx, width, height, createSeededRandom(seed), wear);
  return { canvas, width, height };
}

/** One pull of a loaded brush: a bar of paint with torn ends and a dry trailing edge. */
export function paintSwipe(width, height, color, seed = 1) {
  const rng = createSeededRandom(seed);
  const canvas = makeCanvas(width, height), ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.beginPath();
  const steps = 26;
  for (let i = 0; i <= steps; i++) ctx.lineTo((i / steps) * width, height * (0.06 + rng() * 0.07));
  for (let i = steps; i >= 0; i--) ctx.lineTo((i / steps) * width - rng() * width * 0.012, height * (0.94 - rng() * 0.08));
  ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 60; i++) { // bristle gaps, thicker where the brush runs out
    const y = rng() * height, start = width * (0.45 + rng() * 0.5);
    ctx.globalAlpha = 0.5 + rng() * 0.5;
    ctx.fillRect(start, y, width - start, 0.6 + rng() * 2.4);
  }
  distress(ctx, width, height, rng, 0.5);
  return { canvas, width, height };
}

/** Paint thrown from an impact: a dense core breaking into flecks. */
export function sprayBurst(size, color, seed = 1) {
  const rng = createSeededRandom(seed);
  const canvas = makeCanvas(size, size), ctx = canvas.getContext('2d'), c = size / 2;
  ctx.fillStyle = color;
  for (let i = 0; i < 2600; i++) {
    const a = rng() * Math.PI * 2, d = Math.pow(rng(), 1.9) * c * 0.98;
    const streak = rng() > 0.93 ? 4 + rng() * 14 : 0; // a few drops drag outward
    ctx.globalAlpha = 0.25 + rng() * 0.75 * (1 - d / c);
    ctx.beginPath();
    ctx.ellipse(c + Math.cos(a) * d, c + Math.sin(a) * d, 0.6 + rng() * rng() * 6 + streak, 0.6 + rng() * rng() * 5, a, 0, Math.PI * 2);
    ctx.fill();
  }
  return { canvas, width: size, height: size };
}

/** The mark a wet bottle cap leaves: 21 crimps, pressed unevenly. */
export function capRingStamp(size, color, seed = 1) {
  const rng = createSeededRandom(seed);
  const canvas = makeCanvas(size, size), ctx = canvas.getContext('2d'), c = size / 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.035;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 252; i++) {
    const a = (i / 252) * Math.PI * 2, r = c * (0.84 + 0.045 * Math.sin(a * 21));
    ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
  }
  ctx.closePath(); ctx.stroke();
  ctx.lineWidth = size * 0.012;
  ctx.beginPath(); ctx.arc(c, c, c * 0.68, 0, Math.PI * 2); ctx.stroke();
  distress(ctx, size, size, rng, 2.2);
  return { canvas, width: size, height: size };
}

/**
 * A chalk stroke through `points`, drawn up to `progress` (0..1): several
 * unsteady passes, like a stick of chalk dragged across a rough table.
 */
export function chalkStroke(ctx, points, { width = 8, color = INK.chalk, progress = 1, seed = 1 } = {}) {
  const rng = createSeededRandom(seed);
  const shown = Math.max(2, Math.ceil(points.length * progress));
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let pass = 0; pass < 3; pass++) {
    ctx.globalAlpha = 0.34 + rng() * 0.3;
    ctx.lineWidth = width * (0.5 + rng() * 0.6);
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const jx = (rng() - 0.5) * width * 0.7, jy = (rng() - 0.5) * width * 0.7; // consumed for every point so the line never reshuffles
      if (i < shown) ctx.lineTo(points[i][0] + jx, points[i][1] + jy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Points around an imperfect hand-drawn circle that overshoots its start. */
export function looseCircle(cx, cy, radius, seed = 1) {
  const rng = createSeededRandom(seed), points = [];
  const squash = 0.86 + rng() * 0.1, tilt = rng() * Math.PI;
  for (let i = 0; i <= 44; i++) {
    const a = -1.2 + (i / 40) * Math.PI * 2, r = radius * (1 + i * 0.0035);
    const x = Math.cos(a) * r, y = Math.sin(a) * r * squash;
    points.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
  }
  return points;
}

/** A tactics-board arrow: a bowed shaft and a two-stroke head. */
export function arrowPoints(from, to, bow = 0.16) {
  const dx = to[0] - from[0], dy = to[1] - from[1], shaft = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, lift = Math.sin(t * Math.PI) * bow;
    shaft.push([from[0] + dx * t - dy * lift, from[1] + dy * t + dx * lift]);
  }
  const [tipX, tipY] = shaft[24], [backX, backY] = shaft[21];
  const a = Math.atan2(tipY - backY, tipX - backX), len = Math.hypot(dx, dy) * 0.11;
  const barb = (turn) => [tipX - Math.cos(a + turn) * len, tipY - Math.sin(a + turn) * len];
  return { shaft, head: [barb(0.5), [tipX, tipY], barb(-0.5)] };
}
