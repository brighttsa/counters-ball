// Hand-drawn chalk pitch markings, drawn with deliberate wobble onto the
// cardboard texture canvas. All positions are in world units, mapped to px.
import {
  PITCH_HALF_LENGTH as PL, PITCH_HALF_WIDTH as PW, GOAL_HALF_WIDTH,
} from '../core/pitch-dimensions-and-constants.js';

const CHALK = '#ece1c6';

// A chalk line is never straight: split into short segments, jitter each,
// vary opacity, and let shadowBlur read as chalk dust bleeding into fibres.
function wobblyLine(ctx, x1, y1, x2, y2, rng) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(2, Math.round(len / 14));
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(249, 241, 222, 0.8)';
  let px = x1, py = y1;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const nx = x1 + (x2 - x1) * t + (rng() - 0.5) * 5;
    const ny = y1 + (y2 - y1) * t + (rng() - 0.5) * 5;
    ctx.globalAlpha = 0.42 + rng() * 0.34;
    ctx.lineWidth = 4 + rng() * 2;
    ctx.shadowBlur = 2 + rng() * 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    px = nx; py = ny;
  }
  ctx.restore();
}

function wobblyCircle(ctx, cx, cy, r, rng, startA = 0, endA = Math.PI * 2) {
  const steps = 40;
  let px = cx + Math.cos(startA) * r;
  let py = cy + Math.sin(startA) * r;
  for (let i = 1; i <= steps; i++) {
    const a = startA + (endA - startA) * (i / steps);
    const rr = r + (rng() - 0.5) * 7;
    const nx = cx + Math.cos(a) * rr;
    const ny = cy + Math.sin(a) * rr;
    wobblySegment(ctx, px, py, nx, ny, rng);
    px = nx; py = ny;
  }
}

function wobblySegment(ctx, x1, y1, x2, y2, rng) {
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.42 + rng() * 0.32;
  ctx.lineWidth = 3.5 + rng() * 2;
  ctx.shadowColor = 'rgba(249, 241, 222, 0.8)';
  ctx.shadowBlur = 2.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function chalkSpot(ctx, x, y, r, rng) {
  ctx.save();
  ctx.fillStyle = CHALK;
  ctx.globalAlpha = 0.85;
  ctx.shadowColor = 'rgba(249, 241, 222, 0.9)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(x + (rng() - 0.5) * 3, y + (rng() - 0.5) * 3, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Chalk residue: faint smudges where a palm dragged across a line.
function chalkSmudges(ctx, toPx, rng) {
  for (let i = 0; i < 26; i++) {
    const onLongLine = rng() > 0.5;
    const [x, y] = onLongLine
      ? toPx((rng() * 2 - 1) * PL, (rng() > 0.5 ? 1 : -1) * PW)
      : toPx((rng() > 0.5 ? 1 : -1) * PL, (rng() * 2 - 1) * PW);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 14 + rng() * 26);
    g.addColorStop(0, 'rgba(249, 241, 222, 0.16)');
    g.addColorStop(1, 'rgba(249, 241, 222, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 44, y - 44, 88, 88);
  }
}

/** Draw every marking. `toPx(worldX, worldZ) -> [px, py]`. */
export function drawChalkPitchMarkings(ctx, toPx, rng) {
  const [x0, y0] = toPx(-PL, -PW);
  const [x1, y1] = toPx(PL, PW);
  const [cx, cy] = toPx(0, 0);
  const pxPerUnit = (x1 - x0) / (PL * 2);

  // Outer boundary + halfway line
  wobblyLine(ctx, x0, y0, x1, y0, rng);
  wobblyLine(ctx, x1, y0, x1, y1, rng);
  wobblyLine(ctx, x1, y1, x0, y1, rng);
  wobblyLine(ctx, x0, y1, x0, y0, rng);
  wobblyLine(ctx, cx, y0, cx, y1, rng);

  // Centre circle + kickoff spot
  wobblyCircle(ctx, cx, cy, 0.32 * pxPerUnit, rng);
  chalkSpot(ctx, cx, cy, 5, rng);

  // Penalty boxes, goal areas, spots and arcs — both ends
  for (const side of [-1, 1]) {
    const gx = side * PL;
    const boxD = 0.46, boxHW = 0.56, gaD = 0.2, gaHW = 0.32;
    const [bx0, by0] = toPx(gx, -boxHW);
    const [bx1, by1] = toPx(gx - side * boxD, boxHW);
    wobblyLine(ctx, bx0, by0, bx1, by0, rng);
    wobblyLine(ctx, bx1, by0, bx1, by1, rng);
    wobblyLine(ctx, bx1, by1, bx0, by1, rng);
    const [gx0, gy0] = toPx(gx, -gaHW);
    const [gx1, gy1] = toPx(gx - side * gaD, gaHW);
    wobblyLine(ctx, gx0, gy0, gx1, gy0, rng);
    wobblyLine(ctx, gx1, gy0, gx1, gy1, rng);
    wobblyLine(ctx, gx1, gy1, gx0, gy1, rng);
    const [sx, sy] = toPx(gx - side * 0.34, 0);
    chalkSpot(ctx, sx, sy, 4.5, rng);
    const arcCenterA = side > 0 ? Math.PI : 0;
    wobblyCircle(ctx, sx, sy, 0.16 * pxPerUnit, rng, arcCenterA - 0.9, arcCenterA + 0.9);
    // Goal mouth marks where posts stand
    for (const zs of [-1, 1]) {
      const [mx, my] = toPx(gx, zs * GOAL_HALF_WIDTH);
      chalkSpot(ctx, mx, my, 3.5, rng);
    }
  }

  chalkSmudges(ctx, toPx, rng);
}
