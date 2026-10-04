// Draws the film's graphics for any film time onto a 2D canvas over the picture.
// Nothing here keeps state between frames, so scrubbing and export are exact.
// Type moves the way caps do: it slams into place, and it leaves like a flick.
import { GRAPHIC_CUES } from './promo-title-and-graphic-cues.js';
import { INK } from './nxwrth-promo-timeline-config.js';
import { inkText, paintSwipe, sprayBurst, chalkStroke, looseCircle, arrowPoints } from './promo-ink-and-chalk-graphic-primitives.js';
import { clamp01, easeOut, easeIn, span, slam } from './promo-camera-and-motion-helpers.js';

const Q = 1.5;            // bitmaps are painted at 1.5x the 1920-wide design size
const SLAM = 0.12;        // seconds for a title to land
const FLICK_OUT = 0.16;   // seconds for a title to be flicked off

export function createScreenGraphics(canvas, logoImage) {
  const ctx = canvas.getContext('2d');
  const art = new Map();
  const once = (key, build) => { if (!art.has(key)) art.set(key, build()); return art.get(key); };
  let W = 1, H = 1, safeW = 1, u = 1;

  const anchor = ([ax, ay]) => [(W - safeW) / 2 + ax * safeW, ay * H];

  function drawTitle(cue, f, index) {
    const p = f - cue.t;
    const text = once(`t${index}`, () => inkText(cue.text, { font: cue.font, size: (cue.size ?? 160) * Q, color: cue.color ?? INK.chalk,
      wear: cue.wear ?? 1, seed: 31 + index }));
    const k = Math.min(cue.fit ? Infinity : u / Q, (safeW * (cue.fit ?? 0.9)) / text.width);
    const w = text.width * k, h = text.height * k;
    const [x, y] = anchor(cue.at);
    const left = cue.align === 'center' ? -w / 2 : 0;
    const out = cue.exit === 'flick' ? easeIn(span(f, cue.end - FLICK_OUT, cue.end)) : 0;
    const land = slam(p / SLAM);

    ctx.save();
    ctx.translate(x + out * W * 1.15, y);
    ctx.rotate((cue.rot ?? 0) + (1 - clamp01(p / SLAM)) * 0.03 + out * 0.08);
    ctx.scale(1.42 - 0.42 * land, 1.42 - 0.42 * land); // drops from above the frame onto its mark
    ctx.globalAlpha = clamp01(p / 0.035);
    if (cue.swipe) {
      const bar = once(`s${index}`, () => paintSwipe(text.width * 1.03, text.height * 0.86, cue.swipe, 77 + index));
      const shown = easeOut(span(p, -0.02, 0.1));
      ctx.drawImage(bar.canvas, 0, 0, bar.width * shown, bar.height, left - w * 0.015, -h * 0.43, bar.width * k * shown, bar.height * k);
    }
    if (cue.ticks) { // red, gold, green: three registration marks, nothing more
      [INK.red, INK.gold, INK.green].forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(left + h * 0.14 + i * 62 * u, -h * 0.5, 50 * u * easeOut(span(p, 0.06 + i * 0.05, 0.2 + i * 0.05)), 12 * u);
      });
    }
    ctx.drawImage(text.canvas, left, -h / 2, w, h);
    const line = (yy, seed) => Array.from({ length: 30 }, (_, i) => [left + w * (0.03 + 0.94 * i / 29), yy + Math.sin(i * 0.9 + seed) * h * 0.012]);
    if (cue.underline) chalkStroke(ctx, line(h * 0.4, 2), { width: 9 * u, color: cue.underline, progress: span(p, 0.1, 0.34), seed: 5 + index });
    if (cue.strikeAt != null && f >= cue.strikeAt) {
      chalkStroke(ctx, line(h * 0.04, 4), { width: 16 * u, color: INK.red, progress: span(f, cue.strikeAt, cue.strikeAt + 0.1), seed: 9 + index });
    }
    ctx.restore();
  }

  function drawSpray(cue, f, index) {
    const p = f - cue.t;
    if (p > 0.9) return;
    const burst = once(`b${index}`, () => sprayBurst(1024, cue.color, 123 + index));
    const size = cue.size * u * (0.45 + 0.75 * easeOut(p / 0.3));
    const [x, y] = anchor(cue.at);
    ctx.save();
    ctx.globalAlpha = 1 - span(p, 0.35, 0.9);
    ctx.drawImage(burst.canvas, x - size / 2, y - size / 2, size, size);
    ctx.restore();
  }

  function drawTactics(cue, f, project) {
    const p = f - cue.t, ball = project('ball'), goal = project(cue.goal);
    if (!ball || !goal) return;
    chalkStroke(ctx, looseCircle(ball[0], ball[1], 78 * u, 8), { width: 8 * u, progress: span(p, 0, 0.2), seed: 12 });
    if (p < 0.16) return;
    const start = [ball[0] + (goal[0] - ball[0]) * 0.12, ball[1] + (goal[1] - ball[1]) * 0.12];
    const { shaft, head } = arrowPoints(start, goal, -0.1);
    chalkStroke(ctx, shaft, { width: 8 * u, color: INK.yellow, progress: span(p, 0.16, 0.4), seed: 14 });
    if (p > 0.4) chalkStroke(ctx, head, { width: 8 * u, color: INK.yellow, seed: 15 });
  }

  function drawEndCard(cue, f, index) {
    const p = f - cue.t;
    if (logoImage?.naturalWidth) {
      const land = slam(p / 0.16), w = safeW * 0.5 * (1.3 - 0.3 * land), h = w * logoImage.naturalHeight / logoImage.naturalWidth;
      ctx.save();
      ctx.globalAlpha = clamp01(p / 0.04);
      ctx.drawImage(logoImage, W / 2 - w / 2, H * 0.36 - h / 2, w, h);
      ctx.restore();
    }
    cue.lines.forEach((line, i) => {
      const q = p - line.delay;
      if (q < 0) return;
      const text = once(`e${index}-${i}`, () => inkText(line.text, { size: line.size * Q, color: line.color, tracking: line.tracking, wear: 0.5, seed: 200 + i }));
      const k = Math.min(u / Q, (safeW * 0.9) / text.width), w = text.width * k, h = text.height * k;
      ctx.save();
      ctx.globalAlpha = clamp01(q / 0.05);
      ctx.drawImage(text.canvas, W / 2 - w / 2 - (1 - easeOut(q / 0.22)) * 46 * u, line.y * H - h / 2, w, h); // slides in and stops, like a cap
      ctx.restore();
    });
  }

  return {
    resize(width, height) {
      canvas.width = width; canvas.height = height;
      W = width; H = height;
      safeW = Math.min(W, H * 16 / 9);
      // Narrow frames have height to spare, so type grows; every line is still capped to the safe width.
      u = (safeW / 1920) * (W / H < 0.8 ? 1.7 : W / H < 1.4 ? 1.3 : 1);
    },

    /** @param project (worldPoint | 'ball') => [x, y] in canvas pixels, or null when off-screen */
    render(f, { project, calm = false } = {}) {
      ctx.clearRect(0, 0, W, H);
      GRAPHIC_CUES.forEach((cue, index) => {
        if (f < cue.t || f >= cue.end) return;
        if (cue.kind === 'black') {
          const alpha = (cue.alpha ?? 1) * (cue.fadeFrom != null ? 1 - easeOut(span(f, cue.fadeFrom, cue.end)) : 1);
          ctx.fillStyle = INK.black;
          ctx.globalAlpha = alpha;
          ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 1;
        } else if (cue.kind === 'title') drawTitle(cue, f, index);
        else if (cue.kind === 'spray') drawSpray(cue, f, index);
        else if (cue.kind === 'tactics') drawTactics(cue, f, project);
        else if (cue.kind === 'endCard') drawEndCard(cue, f, index);
      });
      for (const cue of GRAPHIC_CUES) { // flashes sit over everything: a photocopier's lamp, once per hit
        if (cue.kind !== 'flash' || calm || f < cue.t || f >= cue.t + cue.dur) continue;
        ctx.fillStyle = INK.chalk;
        ctx.globalAlpha = cue.alpha * (1 - (f - cue.t) / cue.dur);
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    },
  };
}
