// The maker's chalk signature: "bskt." scratched into the table corner like a kid
// who owns this table signed it. Uses the same chalk dust aesthetic as the pitch
// markings — jittered strokes, varied opacity, shadowBlur bleeding.

const LOGO_PATHS = [
  'M15.48 23.76L16.62 24.85V37.81L1.66 42.38L0 0L15.42 0.97L15.48 23.76ZM5.71 6.57L6 20.56L9.88 21.19L9.82 7.2L5.71 6.57ZM11.02 33.53V27.25L6.28 25.87L7.08 35.64L11.02 33.53Z',
  'M24.52 17.02L32.69 16.28L33.6 40.84L18.81 40.67L19.09 26.5L24.57 26.33L24.12 35.3L27.83 35.47L27.32 22.39L19.26 23.08L18.75 1.77L33.66 1.03L32.97 12.91L27.6 13.42L28.4 6.68H23.77L24.52 17.02Z',
  'M54.55 0.97L44.5 20.22L53.86 39.64L49.12 39.93L40.84 23.19L41.76 40.04H36.16V0.97H41.76L40.56 15.94L49.01 1.2L54.55 0.97Z',
  'M54.31 1.2L71.91 1.94L71.68 8.57L65.85 7.43C65.39 17.02 64.77 39.53 64.77 40.84L59.23 41.12C59.23 40.04 59.97 20.51 60.43 7.65L53.69 7.94L54.31 1.2Z',
  'M72.4 34.5H78V40.21L72.4 40.84V34.5Z',
];
const LOGO_W = 78, LOGO_H = 43;

export function drawChalkMakerSignature(ctx, toPx, rng, style = {}) {
  const color = style.color ?? '#ece1c6';
  const alpha = style.alpha ?? 0.9;
  const blur = style.blur ?? 2.5;
  const scale = style.scale ?? 1.5;

  const [cx, cy] = toPx(1.72, 1.28);
  const angle = -0.08 + (rng() - 0.5) * 0.06;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.translate(-LOGO_W / 2, -LOGO_H / 2);

  for (const d of LOGO_PATHS) {
    const path = new Path2D(d);
    // Two chalk passes: a faint dust halo, then the main fill.
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur * 2;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * 0.3;
    ctx.fill(path);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * (0.7 + rng() * 0.3);
    ctx.fill(path);
    ctx.restore();
  }

  // Chalk dust smudge beside the signature — a palm dragged across it.
  ctx.save();
  ctx.globalAlpha = alpha * 0.15;
  const smudgeX = LOGO_W * 0.5 + rng() * 20;
  const smudgeY = LOGO_H * 0.5 + rng() * 10;
  const g = ctx.createRadialGradient(smudgeX, smudgeY, 4, smudgeX, smudgeY, 28 + rng() * 16);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(smudgeX - 50, smudgeY - 50, 100, 100);
  ctx.restore();

  ctx.restore();
}
