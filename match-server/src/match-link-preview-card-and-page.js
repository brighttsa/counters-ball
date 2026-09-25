// Rich link previews for Play by message: the page a chat app reads for konk.world/m/<id>
// (Open Graph tags + an instant redirect into the game) and the 1200×630 score card image as SVG.
// Everything here is pure; names and taunts are player-typed, so every one is escaped.
import { CAMPAIGN_LEVELS, HOME_TEAM } from '../../src/levels/campaign-level-definitions.js';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
const INK = '#141312';
const PAPER = '#ece1c6';
const YELLOW = '#f5d84a';

const escapeXml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Everything a preview says, read from the latest stored move (packed letter form). */
export function describeMatch(packed) {
  const level = CAMPAIGN_LEVELS.find((l) => l.id === packed.l);
  const [phase, turn, [home, away]] = packed.ra;
  const names = { home: packed.n[0], away: packed.n[1] };
  const mover = packed.by === 'h' ? names.home : names.away;
  const ended = phase === 1;
  const next = turn === 'h' ? names.home : names.away;
  const winner = home === away ? null : home > away ? names.home : names.away;
  return {
    names, scores: { home, away }, mover, ended, taunt: packed.m ?? '',
    pitch: level?.name ?? 'KONK!', place: level?.place ?? '',
    colors: { home: HOME_TEAM.hudColor, away: level?.opponent.team.hudColor ?? PAPER },
    call: ended ? (winner ? `Full time · ${winner} wins` : 'Full time · all square') : `Your move, ${next}`,
  };
}

export function previewTitle(match) {
  return `${match.names.home} ${match.scores.home}–${match.scores.away} ${match.names.away} · ${match.call}`;
}

export function previewDescription(match) {
  const said = match.taunt ? ` “${match.taunt}”` : '';
  return match.ended
    ? `${match.pitch}. ${match.mover} took the last flick.${said}`
    : `${match.pitch}. ${match.mover} just flicked.${said} Watch it, then flick back in KONK!`;
}

/** The score card. Fonts are referenced by family; the renderer loads Anton and Cabin Sketch. */
export function scoreCardSvg(match) {
  const e = escapeXml;
  const pitch = `<g fill="none" stroke="${PAPER}" stroke-opacity="0.13" stroke-width="4">
    <rect x="40" y="40" width="1120" height="550" rx="6"/><line x1="600" y1="40" x2="600" y2="590"/>
    <circle cx="600" cy="315" r="120"/><rect x="40" y="195" width="130" height="240"/><rect x="1030" y="195" width="130" height="240"/></g>`;
  const taunt = match.taunt
    ? `<text x="600" y="452" text-anchor="middle" font-family="Cabin Sketch" font-weight="700" font-size="40" fill="${PAPER}" fill-opacity="0.85">“${e(match.taunt)}”</text>` : '';
  const callWidth = Math.min(1040, 90 + match.call.length * 24);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <rect width="100%" height="100%" fill="${INK}"/>
  ${pitch}
  <text x="84" y="128" font-family="Anton" font-size="76" fill="${YELLOW}">KONK!</text>
  <text x="1116" y="104" text-anchor="end" font-family="Anton" font-size="34" letter-spacing="3" fill="${PAPER}">${e(match.pitch.toUpperCase())}</text>
  <text x="1116" y="140" text-anchor="end" font-family="Cabin Sketch" font-weight="700" font-size="26" fill="${PAPER}" fill-opacity="0.6">${e(match.place)}</text>
  <text x="440" y="318" text-anchor="end" font-family="Anton" font-size="64" fill="${PAPER}">${e(match.names.home.toUpperCase())}</text>
  <rect x="300" y="336" width="140" height="10" rx="5" fill="${e(match.colors.home)}"/>
  <text x="760" y="318" font-family="Anton" font-size="64" fill="${PAPER}">${e(match.names.away.toUpperCase())}</text>
  <rect x="760" y="336" width="140" height="10" rx="5" fill="${e(match.colors.away)}"/>
  <text x="600" y="352" text-anchor="middle" font-family="Cabin Sketch" font-weight="700" font-size="150" fill="${PAPER}">${match.scores.home}–${match.scores.away}</text>
  ${taunt}
  <rect x="${600 - callWidth / 2}" y="496" width="${callWidth}" height="76" rx="4" fill="${YELLOW}" transform="rotate(-1.2 600 534)"/>
  <text x="600" y="552" text-anchor="middle" font-family="Anton" font-size="46" letter-spacing="2" fill="${INK}" transform="rotate(-1.2 600 534)">${e(match.call.toUpperCase())}</text>
</svg>`;
}

/**
 * The page behind konk.world/m/<id>: chat apps read its tags, people are sent straight into the game.
 * @param siteUrl e.g. https://konk.world/ · @param seq the move number, so a new move gets a fresh image URL
 */
export function previewPageHtml(match, { siteUrl, matchId, seq }) {
  const e = escapeXml;
  const pageUrl = `${siteUrl}m/${matchId}`;
  const gameUrl = `${siteUrl}?m=${matchId}`;
  const image = `${siteUrl}m/${matchId}/card.png?s=${seq}`;
  const title = previewTitle(match);
  const description = previewDescription(match);
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>${e(title)} | KONK!</title>
<meta name="description" content="${e(description)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="KONK!" />
<meta property="og:url" content="${e(pageUrl)}" />
<meta property="og:title" content="${e(title)}" />
<meta property="og:description" content="${e(description)}" />
<meta property="og:image" content="${e(image)}" />
<meta property="og:image:secure_url" content="${e(image)}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="${CARD_WIDTH}" />
<meta property="og:image:height" content="${CARD_HEIGHT}" />
<meta property="og:image:alt" content="${e(title)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${e(title)}" />
<meta name="twitter:description" content="${e(description)}" />
<meta name="twitter:image" content="${e(image)}" />
<meta http-equiv="refresh" content="0; url=${e(gameUrl)}" />
<link rel="canonical" href="${e(pageUrl)}" />
</head><body style="background:${INK};color:${PAPER};font-family:sans-serif">
<p><a href="${e(gameUrl)}" style="color:${YELLOW}">Open the match in KONK!</a></p>
<script>location.replace(${JSON.stringify(gameUrl).replace(/</g, '\\u003c')});</script>
</body></html>`;
}
