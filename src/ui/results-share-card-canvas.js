// Full-time share card: a square PNG in the game's ink identity — outcome,
// the score chalked in team tints, the table it was played on, stars or the
// rivalry line, and the cap print — sized for a group chat preview.
import { paintInkCapPoster } from './ink-impact-cap-poster.js';

export const SHARE_CARD_SIZE = 1080;
const INK = '#101514', PAPER = '#f5f1df', MUTED = '#c0c8c0', YELLOW = '#f0cf45', LINE = '#4d5653';
const DISPLAY = 'Anton, Impact, sans-serif';
const CHALK = '"Cabin Sketch", "Chalkboard SE", cursive';
const HAND = '"Patrick Hand", "Chalkboard SE", cursive';
const BODY = '"Avenir Next", "Segoe UI", Arial, sans-serif';

/** The webfonts are already on the page for the menus; wait for them so the card never falls back mid-draw. */
export async function loadShareCardFonts() {
  if (!document.fonts?.load) return;
  try {
    await Promise.all([`120px ${DISPLAY}`, `700 300px ${CHALK}`, `48px ${HAND}`].map((f) => document.fonts.load(f)));
  } catch { /* a system fallback font still makes a readable card */ }
}

/** Team colour chalked onto ink: the same 55% tint the results screen uses. */
export function chalkTint(hex, amount = 0.55) {
  const parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [parse(hex), parse(PAPER)];
  return `rgb(${a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount))).join(' ')})`;
}

function fitFont(ctx, text, maxWidth, size, family, weight = '400') {
  let px = size;
  do { ctx.font = `${weight} ${px}px ${family}`; px -= 4; } while (px > 16 && ctx.measureText(text).width > maxWidth);
}

function star(ctx, cx, cy, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, radius = i % 2 ? r * 0.45 : r;
    ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
  }
  ctx.closePath();
  ctx.lineWidth = 6;
  if (filled) { ctx.fillStyle = YELLOW; ctx.fill(); } else { ctx.strokeStyle = LINE; ctx.stroke(); }
}

/**
 * @param card { kicker, title, scores, homeColour, awayColour, matchup, place, stars: boolean[]|null, notes: string[], footer }
 */
export function drawResultsShareCard(canvas, card) {
  const S = SHARE_CARD_SIZE, mid = S / 2, maxText = S - 120;
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = INK; ctx.fillRect(0, 0, S, S);

  const print = document.createElement('canvas'); // the home screen's cap print, faint in the corner
  paintInkCapPoster(print);
  ctx.globalAlpha = 0.2; ctx.drawImage(print, 600, 580, 640, 480); ctx.globalAlpha = 1;
  ctx.fillStyle = YELLOW; ctx.fillRect(0, 0, S, 20);

  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = YELLOW; ctx.font = `44px ${DISPLAY}`;
  ctx.fillText(card.kicker, mid, 112);
  ctx.fillStyle = PAPER; fitFont(ctx, card.title.toUpperCase(), maxText, 132, DISPLAY);
  ctx.fillText(card.title.toUpperCase(), mid, 262);

  // Score: each side in its team's chalk, the dash in paper, centred as one line.
  const parts = [[String(card.scores.home), chalkTint(card.homeColour)], [' — ', PAPER], [String(card.scores.away), chalkTint(card.awayColour)]];
  ctx.font = `700 300px ${CHALK}`;
  const widths = parts.map(([t]) => ctx.measureText(t).width);
  let x = mid - widths.reduce((a, b) => a + b, 0) / 2;
  ctx.textAlign = 'left';
  parts.forEach(([text, colour], i) => { ctx.fillStyle = colour; ctx.fillText(text, x, 560); x += widths[i]; });
  ctx.textAlign = 'center';

  ctx.fillStyle = PAPER; fitFont(ctx, card.matchup, maxText, 48, BODY, '700');
  ctx.fillText(card.matchup, mid, 672);
  ctx.fillStyle = MUTED; fitFont(ctx, card.place, maxText, 36, BODY);
  ctx.fillText(card.place, mid, 726);

  let y = 830;
  if (card.stars) {
    card.stars.forEach((earned, i) => star(ctx, mid + (i - 1) * 120, y, 44, earned));
    y += 96;
  }
  ctx.fillStyle = YELLOW;
  for (const note of card.notes) { fitFont(ctx, note, maxText, 40, BODY, '700'); ctx.fillText(note, mid, y); y += 56; }
  ctx.fillStyle = PAPER; fitFont(ctx, card.footer, maxText, 52, HAND);
  ctx.fillText(card.footer, mid, S - 56);
  return canvas;
}
