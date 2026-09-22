// Concrete has aggregate and shallow cracks, never carton fibres or corrugation.
export function paintConcreteSurface(ctx, rng, surface, width, height) {
  ctx.fillStyle = surface.base;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 11000; i++) {
    const x = rng() * width, y = rng() * height, radius = 0.4 + rng() * 2;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(245,242,222,0.18)' : 'rgba(66,74,70,0.14)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  // Old court paint is deliberately confined to the slab's outer margins.
  ctx.fillStyle = 'rgba(76,119,139,0.16)';
  ctx.fillRect(35, 50, width - 70, 18);
  ctx.fillRect(72, 50, 16, height - 100);
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = surface.base;
    ctx.fillRect(35 + rng() * (width - 70), 48 + rng() * 24, 3 + rng() * 22, 3);
  }
}
