// Replaying one seeded feature stream aligns color, relief and roughness.
export function paintSurfaceMaterialWear(ctx, rng, s, w, h, channel = 'color') {
  const color = channel === 'color', bump = channel === 'bump';
  const ink = (albedo, relief = '#777777', rough = '#dadada') => color ? albedo : bump ? relief : rough;
  const line = (points, style, width) => {
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();
  };
  const blotch = (x, y, radius, style) => {
    const g = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
    g.addColorStop(0, style); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  if (s.kind === 'concrete') {
    for (let i = 0; i < 12; i++) {
      const x = rng() * w, y = rng() * h;
      blotch(x, y, 40 + rng() * 130, ink('rgba(235,235,218,0.14)', '#929292', '#ededed'));
    }
    for (let i = 0; i < 8; i++) {
      let x = rng() * w, y = i % 2 ? h - 25 : 25;
      const points = [[x, y]];
      for (let j = 0; j < 6; j++) {
        x += (rng() - 0.5) * 40; y += (i % 2 ? -1 : 1) * (8 + rng() * 13);
        points.push([x, y]);
      }
      line(points, ink('rgba(65,72,68,0.24)', '#666666', '#eeeeee'), 1.3);
    }
  }
  if (s.taped || s.dusty) {
    for (const x of [w * 0.27, w * 0.73]) {
      line([[x, 0], [x + 4, h]], ink('rgba(66,44,26,0.3)', '#666666'), 3);
      if (s.taped) {
        ctx.fillStyle = ink('rgba(222,184,105,0.38)', '#969696', '#555555');
        ctx.fillRect(x - 20, 0, 40, h);
        for (let i = 0; i < 24; i++) {
          const y = rng() * h;
          line([[x - 18, y], [x + 16, y + rng() * 10]],
            ink('rgba(248,223,164,0.24)', '#a0a0a0', '#777777'), 1.5);
        }
      }
    }
    if (s.taped) {
      ctx.save(); ctx.translate(w * 0.4, h * 0.92); ctx.rotate(-0.035);
      ctx.strokeStyle = ink('rgba(62,77,60,0.23)', '#808080', '#b0b0b0');
      ctx.lineWidth = 3; ctx.strokeRect(0, -38, 200, 44);
      ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const x = 16 + i * 18;
        line([[x, -32], [x, -10]], ctx.strokeStyle, i % 3 === 0 ? 3 : 1.5);
      }
      ctx.restore();
    }
    if (s.dusty) for (const x of [20, w - 20]) for (const y of [20, h - 20]) {
      blotch(x, y, 160 + rng() * 100, ink('rgba(239,221,185,0.6)', '#999999', '#fafafa'));
    }
  }
  if (s.painted) {
    const colors = ['rgba(65,105,100,0.5)', 'rgba(205,199,167,0.45)', 'rgba(102,123,130,0.5)'];
    for (let p = 0; p < s.planks; p++) {
      ctx.fillStyle = ink(colors[p % colors.length], '#858585', '#969696');
      ctx.fillRect(0, p * h / s.planks + 5, w, h / s.planks - 10);
    }
    for (let i = 0; i < 650; i++) {
      const x = rng() * w, y = rng() * h;
      ctx.fillStyle = ink('rgba(159,132,97,0.48)', '#737373', '#d8d8d8');
      ctx.fillRect(x, y, 5 + rng() * 65, 0.7 + rng() * 3);
    }
    for (let i = 0; i < 7; i++) {
      const x = 100 + rng() * (w - 200), y = i % 2 ? 90 : h - 90;
      ctx.strokeStyle = ink('rgba(58,49,36,0.2)', '#808080', '#c8c8c8');
      ctx.lineWidth = 4; ctx.beginPath();
      ctx.ellipse(x, y, 24 + rng() * 18, 20, 0, 0.2, Math.PI * 1.9); ctx.stroke();
    }
  }
  if (s.planks) for (let p = 1; p < s.planks; p++) {
    line([[0, p * h / s.planks], [w, p * h / s.planks]],
      ink('rgba(23,24,20,0.5)', '#505050', '#eeeeee'), 3);
  }
  if (s.varnished) {
    for (let i = 0; i < 20; i++) {
      const x = rng() * w, y = rng() * h;
      blotch(x, y, 45 + rng() * 120, ink('rgba(244,202,126,0.1)', '#808080', '#555555'));
    }
    for (let i = 0; i < 100; i++) {
      const x = 180 + rng() * (w - 360), y = (rng() > 0.5 ? 0.15 : 0.85) * h;
      line([[x, y], [x + rng() * 45, y + (rng() - 0.5) * 20]],
        ink('rgba(238,209,155,0.26)', '#797979', '#dddddd'), 1 + rng() * 2);
    }
  }
  if (s.salt) {
    for (let i = 0; i < 650; i++) {
      const x = rng() * w, y = rng() > 0.5 ? rng() * 105 : h - rng() * 105;
      ctx.fillStyle = ink('rgba(216,221,200,0.34)', '#999999', '#eeeeee');
      ctx.fillRect(x, y, 2 + rng() * 14, 1 + rng() * 3);
    }
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = ink('rgba(73,126,126,0.3)', '#858585', '#9f9f9f');
      ctx.fillRect(rng() * w, rng() * h, 10 + rng() * 36, 2 + rng() * 5);
    }
  }
}
