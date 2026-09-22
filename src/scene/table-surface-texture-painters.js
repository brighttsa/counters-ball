// Seeded albedo, bump and roughness maps share the same world-aligned sheet.
import { drawChalkPitchMarkings } from './chalk-pitch-markings.js';
import { paintConcreteSurface } from './table-surface-concrete-painter.js';
import { paintSurfaceMaterialWear } from './table-surface-material-wear-painter.js';
import { createSeededRandom } from '../core/seeded-random-number-generator.js';
import { TABLE_HALF_LENGTH as TL } from '../core/pitch-dimensions-and-constants.js';

const W = 1408, H = 1024;
const PX_PER_UNIT = W / (TL * 2);
const toPx = (wx, wz) => [W / 2 + wx * PX_PER_UNIT, H / 2 + wz * PX_PER_UNIT];

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function softBlotch(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function paintScratches(ctx, rng, count, color) {
  for (let i = 0; i < count; i++) {
    const x = rng() * W, y = rng() * H;
    ctx.strokeStyle = color(rng);
    ctx.lineWidth = 0.6 + rng() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (rng() - 0.5) * 80, y + (rng() - 0.5) * 80,
      x + (rng() - 0.5) * 130, y + (rng() - 0.5) * 130);
    ctx.stroke();
  }
}

function paintCardboard(ctx, rng, s) {
  ctx.fillStyle = s.base;
  ctx.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 9) { // flattened-box corrugation ridges
    ctx.fillStyle = `rgba(90, 58, 28, ${0.02 + rng() * 0.03})`;
    ctx.fillRect(x, 0, 3.5, H);
  }
  for (let i = 0; i < 5200; i++) { // fibre hairs
    const x = rng() * W, y = rng() * H, len = 3 + rng() * 16, a = (rng() - 0.5) * 0.7;
    ctx.strokeStyle = rng() > 0.5
      ? `rgba(226, 194, 148, ${0.05 + rng() * 0.1})` : `rgba(84, 52, 24, ${0.04 + rng() * 0.09})`;
    ctx.lineWidth = 0.8 + rng();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  for (let i = 0; i < 14; i++) {
    softBlotch(ctx, rng() * W, rng() * H, 50 + rng() * 150,
      rng() > 0.45 ? 'rgba(96, 60, 26, 0.1)' : 'rgba(235, 205, 160, 0.1)');
  }
  paintScratches(ctx, rng, 90, (r) => `rgba(60, 36, 16, ${0.05 + r() * 0.12})`);
  if (s.dusty) { // harmattan dust settled over everything
    for (let i = 0; i < 18; i++) softBlotch(ctx, rng() * W, rng() * H, 90 + rng() * 220, 'rgba(236, 222, 198, 0.16)');
    for (let i = 0; i < 7000; i++) {
      ctx.fillStyle = `rgba(240, 228, 206, ${0.08 + rng() * 0.2})`;
      ctx.fillRect(rng() * W, rng() * H, 1 + rng() * 1.8, 1 + rng() * 1.8);
    }
  }
}

function paintWood(ctx, rng, s) {
  ctx.fillStyle = s.base;
  ctx.fillRect(0, 0, W, H);
  const planks = s.planks ?? (s.carvings ? 5 : 1);
  for (let p = 0; p < planks; p++) {
    const y0 = (p * H) / planks;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(255, 230, 190, 0.05)' : 'rgba(30, 16, 6, 0.08)';
    ctx.fillRect(0, y0, W, H / planks);
    if (p > 0) { ctx.fillStyle = 'rgba(15, 8, 3, 0.55)'; ctx.fillRect(0, y0 - 2, W, 4); }
  }
  for (let y = 0; y < H; y += 2.5) { // wavy grain
    const amp = 2 + rng() * 6, freq = 0.004 + rng() * 0.006, phase = rng() * 6.28;
    ctx.strokeStyle = rgba(s.grain, 0.04 + rng() * 0.12);
    ctx.lineWidth = 0.8 + rng() * 1.4;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 24) {
      const yy = y + Math.sin(x * freq + phase) * amp + Math.sin(x * 0.0013 + y * 0.01) * 10;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  for (let k = 0; k < 5; k++) { // knots
    const cx = rng() * W, cy = rng() * H;
    for (let ring = 1; ring < 7; ring++) {
      ctx.strokeStyle = rgba(s.dark, 0.14);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 6 + ring * 6, 3 + ring * 2.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  softBlotch(ctx, W / 2, H / 2, 480, 'rgba(255, 236, 200, 0.07)'); // varnish worn by elbows
  paintScratches(ctx, rng, 120, (r) => `rgba(235, 205, 165, ${0.06 + r() * 0.12})`);
  for (const text of s.carvings ?? []) { // initials carved into the desk margins
    ctx.save();
    ctx.translate(120 + rng() * (W - 480), rng() > 0.5 ? 70 + rng() * 60 : H - 60 - rng() * 60);
    ctx.rotate((rng() - 0.5) * 0.3);
    ctx.font = 'bold 42px Georgia, serif';
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.strokeText(text, 1.5, 1.5);
    ctx.strokeStyle = 'rgba(232, 200, 158, 0.32)';
    ctx.strokeText(text, 0, 0);
    ctx.restore();
  }
}

function paintBump(bctx, rng, s) {
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, W, H);
  if (s.kind === 'wood') {
    for (let y = 0; y < H; y += 4) {
      const v = 110 + Math.floor(rng() * 50);
      bctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
      bctx.fillRect(0, y, W, 1 + rng() * 1.5);
    }
  }
  for (let i = 0; i < 9000; i++) {
    const v = 100 + Math.floor(rng() * 90);
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.fillRect(rng() * W, rng() * H, 1 + rng() * 2.5, 1 + rng() * 2.5);
  }
  for (let i = 0; i < 26; i++) softBlotch(bctx, rng() * W, rng() * H, 14 + rng() * 42, 'rgba(52, 52, 52, 0.55)');
}

export function paintTableSurfaceTextures(surface, seed, profile) {
  surface = profile?.surface ?? surface;
  const rng = createSeededRandom(seed);
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = W; colorCanvas.height = H;
  const ctx = colorCanvas.getContext('2d');
  if (surface.kind === 'concrete') paintConcreteSurface(ctx, rng, surface, W, H);
  else (surface.kind === 'wood' ? paintWood : paintCardboard)(ctx, rng, surface);
  const wear = (context, channel) => paintSurfaceMaterialWear(context,
    createSeededRandom(seed ^ 0x51f15e), surface, W, H, channel);
  wear(ctx, 'color');
  // Markings have their own stream, so extra surface wear cannot move the pitch.
  drawChalkPitchMarkings(ctx, toPx, createSeededRandom(seed ^ 0xc4a1), profile?.markings);

  const edge = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.86);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(40, 22, 8, 0.42)'); // frayed, handled edges
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = W; bumpCanvas.height = H;
  paintBump(bumpCanvas.getContext('2d'), rng, surface);
  wear(bumpCanvas.getContext('2d'), 'bump');
  const roughnessCanvas = document.createElement('canvas');
  roughnessCanvas.width = W; roughnessCanvas.height = H;
  const rctx = roughnessCanvas.getContext('2d');
  rctx.fillStyle = surface.varnished ? '#969696' : surface.kind === 'wood' ? '#cccccc' : '#ededed';
  rctx.fillRect(0, 0, W, H);
  wear(rctx, 'roughness');
  return { colorCanvas, bumpCanvas, roughnessCanvas };
}
