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
      stars: parsed && typeof parsed.stars === 'object' ? parsed.stars : {},
      muted: Boolean(parsed?.muted),
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

export function totalStars(progress) {
  return Object.values(progress.stars).reduce((sum, n) => sum + n, 0);
}
