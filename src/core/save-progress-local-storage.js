// Campaign progress (best stars per venue) + sound preference, persisted in
// localStorage. Every access is guarded: private windows and blocked storage
// must never break the game — it simply starts fresh.
const STORAGE_KEY = 'counters-ball-3d/progress-v1';

export function loadProgress() {
  const fresh = { stars: {}, muted: false };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw);
    return {
      stars: parsed?.stars && typeof parsed.stars === 'object' && !Array.isArray(parsed.stars)
        ? Object.fromEntries(Object.entries(parsed.stars).filter(([, value]) => Number.isInteger(value) && value >= 0 && value <= 3)) : {},
      muted: Boolean(parsed?.muted),
      ...(typeof parsed?.lastLegendAct === 'string' && { lastLegendAct: parsed.lastLegendAct }),
      ...(parsed?.hudStyle === 'chalk' && { hudStyle: 'chalk' }),
    };
  } catch {
    return fresh;
  }
}

export function saveProgress(progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch { /* storage unavailable: progress lives for this session only */ }
}

/** Keep the best star count ever earned on a venue. Returns true if improved. */
export function recordLevelStars(progress, levelId, stars) {
  const previous = progress.stars[levelId] ?? 0;
  if (stars <= previous) return false;
  progress.stars[levelId] = stars;
  saveProgress(progress);
  return true;
}

/** A venue unlocks once the previous venue has been won at least once. */
export function isLevelUnlocked(progress, levels, index) {
  if (index === 0) return true;
  return (progress.stars[levels[index - 1].id] ?? 0) >= 1;
}

/** Stars across `levels` (defaults to everything saved, including Street Legends acts). */
export function totalStars(progress, levels = null) {
  const values = levels ? levels.map((level) => progress.stars[level.id] ?? 0) : Object.values(progress.stars);
  return values.reduce((sum, n) => sum + n, 0);
}
