export const MENU_COPY = Object.freeze({
  localIntro: 'Two names. One table. Take turns on this screen.',
  obstacles: 'Obstacles are in play. Bank if you can.',
  dust: 'Dust slows the caps.',
  noObstacles: 'No fixed obstacles',
});

export const RESULTS_COPY = Object.freeze({
  draw: 'Nothing between you.',
  homeWin: "That's yours.",
  classicFinal: 'Every table settled. For now.',
  improved: 'New best on this table.',
  ordinaryWin: 'Made that one count.',
  soloOut: 'Out of flicks. Set up the next angle.',
  drawnStars: 'Level on goals. Win the rematch to earn stars.',
  playAgain: 'Play again',
  shareLocalFooter: 'One table. Two players. Settle it again.',
  shareSoloFooter: 'Same table. Your move.',
});

export const starGoals = (flicks) => ['Win', 'Concede no goals', `Win in ${flicks} flicks or fewer`];
export const starRules = (flicks) => starGoals(flicks).map((goal) => `★ ${goal}`);
export const conditionObstacleCopy = (count) => count ? `${count} fixed obstacles` : MENU_COPY.noObstacles;
export const titleStarsCopy = (earned, max) => earned > 0
  ? `★ ${earned}/${max} stars` : 'Six pitches. Six stories to settle.';

export function resultTitle(winner, mode, names, opponent) {
  if (winner === null) return RESULTS_COPY.draw;
  if (mode === 'versus') return `${names[winner]} takes it.`;
  return winner === 'home' ? RESULTS_COPY.homeWin : `${opponent} takes it`;
}
