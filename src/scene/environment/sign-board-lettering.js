// Hand-painted signboards: a framed board with a cast shadow and lettering
// shrunk to fit — shop names, chop-bar menus, the lorry-station chalkboard.
export const SIGN_FONT = "'Lilita One', Impact, 'Arial Black', sans-serif";
export const CHALK_FONT = "'Cabin Sketch', 'Chalkboard SE', 'Comic Sans MS', cursive";

export function fitFont(ctx, text, maxWidth, sizePx, family) {
  let size = sizePx;
  do {
    ctx.font = `${size}px ${family}`;
    size -= 2;
  } while (ctx.measureText(text).width > maxWidth && size > 12);
}

export function dropShadow(ctx, r) {
  ctx.fillStyle = 'rgba(20, 12, 6, 0.35)';
  ctx.fillRect(r.x + 8, r.y + 10, r.w, r.h);
}

/** @param r canvas rect { x, y, w, h } */
export function textBoard(ctx, r, { title, lines = [], bg, fg, font = SIGN_FONT, frame = 'rgba(30,20,10,0.8)', frameWidth = 11 }) {
  dropShadow(ctx, r);
  ctx.fillStyle = bg;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = frame;
  ctx.lineWidth = frameWidth;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, title, r.w * 0.9, lines.length ? r.h * 0.2 : r.h * 0.62, SIGN_FONT);
  ctx.fillText(title, r.x + r.w / 2, r.y + (lines.length ? r.h * 0.16 : r.h / 2));
  lines.forEach((line, i) => {
    fitFont(ctx, line, r.w * 0.86, r.h * 0.13, font);
    ctx.fillText(line, r.x + r.w / 2, r.y + r.h * (0.37 + i * (0.6 / Math.max(1, lines.length))));
  });
}
