// Marks people leave on the ground: bare footprint trails, lorry and car tyre
// tracks, and a chalk hopscotch grid scratched onto the playground.
import { GROUND_CANVAS_W as W, px, pz } from './ground-zone-mapping.js';

export function footprints(ctx, rng, count, z0, z1, alpha = 0.16) {
  for (let t = 0; t < count; t++) {
    let x = rng() * W, y = pz(z0) + rng() * (pz(z1) - pz(z0));
    const heading = rng() * Math.PI * 2;
    for (let s = 0; s < 8; s++) {
      const side = s % 2 ? 1 : -1;
      ctx.save();
      ctx.translate(x + Math.cos(heading + Math.PI / 2) * side * 9, y + Math.sin(heading + Math.PI / 2) * side * 9);
      ctx.rotate(heading + Math.PI / 2);
      ctx.fillStyle = `rgba(40, 24, 12, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      x += Math.cos(heading) * 70;
      y += Math.sin(heading) * 70;
    }
  }
}

export function tyreTracks(ctx, rng, z, spread = 5.5) {
  for (const offset of [-spread / 2, spread / 2]) {
    const y0 = pz(z + offset);
    ctx.strokeStyle = 'rgba(35, 22, 12, 0.22)';
    ctx.lineWidth = 58;
    ctx.beginPath();
    for (let x = -40; x <= W + 40; x += 60) ctx.lineTo(x, y0 + Math.sin(x * 0.002 + z) * 26);
    ctx.stroke();
    for (let x = 0; x < W; x += 22) { // tread
      ctx.fillStyle = `rgba(25, 15, 8, ${0.12 + rng() * 0.1})`;
      ctx.fillRect(x, y0 + Math.sin(x * 0.002 + z) * 26 - 24, 7, 48);
    }
  }
}

function chalkLine(ctx, rng, x0, y0, x1, y1) {
  ctx.strokeStyle = `rgba(240, 232, 214, ${0.28 + rng() * 0.18})`;
  ctx.lineWidth = 6 + rng() * 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + (rng() - 0.5) * 6, y0 + (rng() - 0.5) * 6);
  ctx.lineTo(x1 + (rng() - 0.5) * 6, y1 + (rng() - 0.5) * 6);
  ctx.stroke();
}

/** Singles and pairs of ~33 cm boxes laid along x, scuffed by use. */
export function hopscotch(ctx, rng, startX, z) {
  const box = 1.75;
  let x = startX, n = 1;
  ctx.font = 'bold 52px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const cells of [1, 1, 2, 1, 2, 1]) {
    for (let c = 0; c < cells; c++) {
      const zTop = cells === 1 ? z - box / 2 : z - box + c * box;
      const [a, b, cz, d] = [px(x), pz(zTop), px(x + box), pz(zTop + box)];
      chalkLine(ctx, rng, a, b, cz, b); chalkLine(ctx, rng, cz, b, cz, d);
      chalkLine(ctx, rng, cz, d, a, d); chalkLine(ctx, rng, a, d, a, b);
      ctx.fillStyle = 'rgba(240, 232, 214, 0.32)';
      ctx.fillText(String(n++), (a + cz) / 2, (b + d) / 2);
    }
    x += box;
  }
}
