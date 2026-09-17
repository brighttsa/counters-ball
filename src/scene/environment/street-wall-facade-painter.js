// Painted building fronts behind each venue: plaster with rain streaks and
// splash-back dirt, skirting bands, louvre windows with burglar-proof bars,
// wooden shutters, doors, zinc sheeting, hand-painted signs and slogans, a
// kiosk serving hatch stocked with goods, and canoe-stripe murals. Lit
// features also paint into a separate glow canvas used at night.
import { createCanvas, softBlotch } from './canvas-texture-helpers.js';
import { textBoard, dropShadow, SIGN_FONT, CHALK_FONT } from './sign-board-lettering.js';

export const WALL_SIZE = { width: 30, height: 15 }; // world units (≈ 5.7 m × 2.9 m)
const PPU = 68;
const CW = WALL_SIZE.width * PPU, CH = WALL_SIZE.height * PPU;
const X = (x) => (x + WALL_SIZE.width / 2) * PPU;
const Y = (y) => (WALL_SIZE.height - y) * PPU; // y measured up from the ground
const S = (u) => u * PPU;
function rect(f) {
  return { x: X(f.x - f.w / 2), y: Y((f.y ?? 0) + f.h), w: S(f.w), h: S(f.h) };
}

const FEATURES = {
  corrugated(ctx, f, rng) {
    const top = Y(f.y + f.h), h = S(f.h), pitch = S(0.3);
    ctx.fillStyle = f.color;
    ctx.fillRect(0, top, CW, h);
    for (let x = 0; x < CW; x += pitch) {
      const g = ctx.createLinearGradient(x, 0, x + pitch, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.14)');
      g.addColorStop(0.5, 'rgba(0,0,0,0.2)');
      g.addColorStop(1, 'rgba(255,255,255,0.1)');
      ctx.fillStyle = g;
      ctx.fillRect(x, top, pitch, h);
    }
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = `rgba(120, 62, 28, ${0.1 + rng() * 0.25})`;
      ctx.fillRect(rng() * CW, top + rng() * h * 0.3, 3 + rng() * 10, h * (0.1 + rng() * 0.5));
    }
  },
  louvreWindow(ctx, f) {
    const r = rect(f);
    dropShadow(ctx, r);
    ctx.fillStyle = '#2b2622';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    for (let sy = r.y + S(0.2); sy < r.y + r.h - S(0.3); sy += S(0.38)) {
      const g = ctx.createLinearGradient(0, sy, 0, sy + S(0.38));
      g.addColorStop(0, 'rgba(214, 228, 235, 0.95)'); // sky caught in the glass slat
      g.addColorStop(0.55, 'rgba(118, 142, 156, 0.95)');
      g.addColorStop(1, 'rgba(58, 70, 78, 0.95)');
      ctx.fillStyle = g;
      ctx.fillRect(r.x + S(0.18), sy, r.w - S(0.36), S(0.38) - 3);
    }
    ctx.strokeStyle = '#1c1917'; // burglar-proof bars
    ctx.lineWidth = 5;
    for (let bx = r.x + S(0.9); bx < r.x + r.w; bx += S(0.9)) { ctx.beginPath(); ctx.moveTo(bx, r.y); ctx.lineTo(bx, r.y + r.h); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(r.x, r.y + r.h / 2); ctx.lineTo(r.x + r.w, r.y + r.h / 2); ctx.stroke();
    ctx.fillStyle = 'rgba(222, 212, 192, 0.95)';
    ctx.fillRect(r.x - S(0.25), r.y + r.h, r.w + S(0.5), S(0.35)); // sill
  },
  shutter(ctx, f, rng) {
    const r = rect(f);
    dropShadow(ctx, r);
    for (const leaf of [0, 1]) {
      const lx = r.x + leaf * r.w / 2;
      ctx.fillStyle = f.color;
      ctx.fillRect(lx, r.y, r.w / 2 - 4, r.h);
      for (let sy = r.y + S(0.25); sy < r.y + r.h - S(0.2); sy += S(0.3)) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(lx + S(0.2), sy, r.w / 2 - S(0.45), 4);
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(lx + S(0.2), sy + 5, r.w / 2 - S(0.45), 3);
      }
      for (let i = 0; i < 10; i++) softBlotch(ctx, lx + rng() * r.w / 2, r.y + rng() * r.h, 10 + rng() * 30, 'rgba(230, 220, 190, 0.18)');
    }
    ctx.strokeStyle = 'rgba(25, 18, 10, 0.8)';
    ctx.lineWidth = 7;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  },
  door(ctx, f, rng) {
    const r = rect({ ...f, y: 0 });
    ctx.fillStyle = f.color;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 6;
    for (const [px, py] of [[0.12, 0.08], [0.55, 0.08], [0.12, 0.54], [0.55, 0.54]]) {
      ctx.strokeRect(r.x + r.w * px, r.y + r.h * py, r.w * 0.33, r.h * 0.38);
    }
    ctx.fillStyle = '#c9a65a';
    ctx.beginPath(); ctx.arc(r.x + r.w * 0.88, r.y + r.h * 0.52, 10, 0, Math.PI * 2); ctx.fill();
    const kick = ctx.createLinearGradient(0, r.y + r.h * 0.8, 0, r.y + r.h);
    kick.addColorStop(0, 'rgba(90, 50, 20, 0)');
    kick.addColorStop(1, 'rgba(90, 50, 20, 0.55)');
    ctx.fillStyle = kick;
    ctx.fillRect(r.x, r.y + r.h * 0.8, r.w, r.h * 0.2);
    ctx.strokeStyle = 'rgba(20, 14, 8, 0.85)';
    ctx.lineWidth = 9;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    for (let i = 0; i < 12; i++) softBlotch(ctx, r.x + rng() * r.w, r.y + rng() * r.h, 8 + rng() * 26, 'rgba(235, 225, 200, 0.16)');
  },
  sign(ctx, f, rng, glow) {
    textBoard(ctx, rect(f), { title: f.text, bg: f.bg, fg: f.fg });
    if (f.lit && glow) { glow.shadowColor = 'rgba(255, 200, 120, 1)'; glow.shadowBlur = 50; textBoard(glow, rect(f), { title: f.text, bg: f.bg, fg: f.fg }); glow.shadowBlur = 0; }
  },
  menu(ctx, f) {
    textBoard(ctx, rect(f), { title: f.title, lines: f.lines, bg: f.bg, fg: f.fg });
  },
  board(ctx, f) { // chalk destination board
    textBoard(ctx, rect(f), { title: f.title, lines: f.lines, bg: '#26352a', fg: '#e8e2c8', font: CHALK_FONT, frame: '#6b4a2a', frameWidth: 16 });
  },
  slogan(ctx, f) {
    const size = S(f.size);
    ctx.fillStyle = f.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${size}px ${SIGN_FONT}`;
    f.text.split('\n').forEach((line, i) => ctx.fillText(line, X(f.x), Y(f.y) + i * size * 1.1));
  },
  hatch(ctx, f, rng, glow) {
    const r = rect(f);
    ctx.fillStyle = '#140d08';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    const goods = ['#c8342a', '#f0c040', '#2c6e4b', '#e8e2d4', '#2f5d9a', '#d0692a'];
    for (let shelf = 1; shelf <= 3; shelf++) {
      const sy = r.y + (r.h * shelf) / 3.4;
      ctx.fillStyle = '#6b4a2a';
      ctx.fillRect(r.x + 10, sy, r.w - 20, S(0.12));
      for (let gx = r.x + 16; gx < r.x + r.w - 30;) {
        const tall = rng() > 0.5, gw = S(tall ? 0.3 : 0.45), gh = S(tall ? 0.9 : 0.55);
        ctx.fillStyle = goods[Math.floor(rng() * goods.length)];
        ctx.fillRect(gx, sy - gh, gw, gh);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(gx + 2, sy - gh * 0.65, gw - 4, gh * 0.22); // label
        gx += gw + 4 + rng() * 10;
      }
    }
    ctx.fillStyle = '#8a6238'; // counter ledge
    ctx.fillRect(r.x - S(0.4), r.y + r.h, r.w + S(0.8), S(0.45));
    ctx.strokeStyle = '#1c1410';
    ctx.lineWidth = 10;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    if (f.lit && glow) {
      const g = glow.createRadialGradient(r.x + r.w / 2, r.y + r.h * 0.35, 10, r.x + r.w / 2, r.y + r.h / 2, r.w * 0.7);
      g.addColorStop(0, 'rgba(255, 200, 130, 0.9)');
      g.addColorStop(1, 'rgba(255, 150, 70, 0.25)');
      glow.fillStyle = g;
      glow.fillRect(r.x, r.y, r.w, r.h);
    }
  },
  stripes(ctx, f) { // canoe-paint colour bands with a zig-zag crest
    const top = Y(f.y + f.h), band = S(f.h) / f.colors.length;
    f.colors.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, top + i * band, CW, band + 1); });
    ctx.fillStyle = f.colors[1];
    for (let x = 0; x < CW; x += S(0.8)) {
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + S(0.4), top - S(0.45)); ctx.lineTo(x + S(0.8), top); ctx.fill();
    }
  },
};

function weather(ctx, rng) {
  for (let i = 0; i < 150; i++) { // rain streaks from roof edges and sills
    const x = rng() * CW, y = rng() * CH * 0.5, len = 40 + rng() * 380;
    const g = ctx.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, 'rgba(35, 22, 10, 0.16)');
    g.addColorStop(1, 'rgba(35, 22, 10, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, 2 + rng() * 9, len);
  }
  const splash = ctx.createLinearGradient(0, CH - S(1.5), 0, CH);
  splash.addColorStop(0, 'rgba(90, 50, 22, 0)');
  splash.addColorStop(1, 'rgba(90, 50, 22, 0.45)');
  ctx.fillStyle = splash;
  ctx.fillRect(0, CH - S(1.5), CW, S(1.5));
  ctx.strokeStyle = 'rgba(30, 20, 12, 0.35)';
  for (let i = 0; i < 14; i++) {
    let x = rng() * CW, y = rng() * CH;
    ctx.lineWidth = 1 + rng() * 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 7; s++) { x += (rng() - 0.5) * 50; y += 20 + rng() * 40; ctx.lineTo(x, y); }
    ctx.stroke();
  }
}

/** @returns {{ color: HTMLCanvasElement, lights: HTMLCanvasElement | null }} */
export function paintWallFacade(spec, rng) {
  const color = createCanvas(CW, CH);
  const ctx = color.getContext('2d');
  ctx.fillStyle = spec.base;
  ctx.fillRect(0, 0, CW, CH);
  for (let i = 0; i < 50; i++) {
    softBlotch(ctx, rng() * CW, rng() * CH, 40 + rng() * 220, rng() > 0.5 ? 'rgba(255,240,215,0.1)' : 'rgba(40,25,12,0.12)');
  }
  if (spec.skirtH) {
    ctx.fillStyle = spec.skirting;
    ctx.fillRect(0, Y(spec.skirtH), CW, S(spec.skirtH));
  }
  const needsGlow = spec.features.some((f) => f.lit);
  const lights = needsGlow ? createCanvas(CW, CH) : null;
  const glow = lights?.getContext('2d') ?? null;
  for (const feature of spec.features) FEATURES[feature.type](ctx, feature, rng, glow);
  weather(ctx, rng);
  return { color, lights };
}
