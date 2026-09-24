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
export const STAR_SVG = '<svg class="star-svg" aria-hidden="true" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" fill="currentColor"/></svg>';
export const starRules = (flicks) => starGoals(flicks);
export const conditionObstacleCopy = (count) => (count ? `${count} fixed obstacle${count === 1 ? '' : 's'}` : MENU_COPY.noObstacles);

// A Street Legends table is defined by its moving feature, so "No fixed obstacles" alone would mislead.
export const TABLE_FEATURE_COPY = Object.freeze({
  'ruler-seesaw': 'Turning ruler in play',
  'change-dish': 'Turning change dish guards the goal',
  'clay-pot-maze': 'Clay pots in play',
  'toll-gates': 'Toll booms open and close',
  'departing-lorry': 'Goal rides a moving lorry',
  'coin-stack-chain': 'Padlocked goal, coin stacks to light',
});

/** The table part of a conditions line: the venue's moving feature first, then any fixed obstacles. */
export function tableConditionCopy(level) {
  const feature = TABLE_FEATURE_COPY[level.mechanic?.type];
  const count = level.obstacles?.length ?? 0;
  if (!feature) return conditionObstacleCopy(count);
  return count ? `${feature} · ${conditionObstacleCopy(count)}` : feature;
}
export const titleStarsCopy = (earned, max) => earned > 0
  ? `${earned}/${max} stars` : 'Six pitches. Six stories to settle.';

export function resultTitle(winner, mode, names, opponent) {
  if (winner === null) return RESULTS_COPY.draw;
  if (mode === 'versus') return `${names[winner]} takes it.`;
  return winner === 'home' ? RESULTS_COPY.homeWin : `${opponent} takes it`;
}
