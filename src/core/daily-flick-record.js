// Daily Flick record on this device: the best score per puzzle and the run of consecutive days played.
// A day counts once a puzzle is finished (scored or not); the streak breaks when a day is skipped.

/** @returns {{ best: number|null, streak: number, improved: boolean }} flicks = null when no goal */
export function recordDailyResult(progress, number, flicks) {
  const daily = (progress.daily ??= { best: {}, streak: 0, lastDay: 0 });
  const previous = daily.best[number] ?? null;
  const improved = flicks !== null && (previous === null || flicks < previous);
  if (improved) daily.best[number] = flicks;
  if (daily.lastDay !== number) {
    daily.streak = daily.lastDay === number - 1 ? daily.streak + 1 : 1;
    daily.lastDay = number;
  }
  // Keep the saved record small: the last 60 puzzles are plenty for a best score.
  for (const key of Object.keys(daily.best)) if (Number(key) < number - 60) delete daily.best[key];
  return { best: daily.best[number] ?? null, streak: daily.streak, improved };
}

/** Wordle-style share line: one ball per flick used, then par and streak. */
export function dailyShareText(number, best, par, streak, url) {
  const score = best === null ? 'no goal ✗' : `${'⚽'.repeat(best)} ${best} flick${best === 1 ? '' : 's'} (par ${par})`;
  return `KONK! Daily Flick #${number}\n${score}${streak > 1 ? ` · ${streak}-day streak` : ''}\n${url}`;
}
