// Campaign progress (best stars per venue), preferences, and the 2-Player Table's
// names and head-to-head records, persisted in localStorage. Every access is guarded: private windows and blocked storage
// must never break the game — it simply starts fresh.
const STORAGE_KEY = 'counters-ball-3d/progress-v1';

const isCount = (value) => Number.isInteger(value) && value >= 0;
const MUSIC_VOLUMES = [0, 0.35, 0.7, 1]; // the pause menu's Off / Low / Medium / High
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const validNames = (names) => isPlainObject(names) && [names.home, names.away].every((n) => typeof n === 'string' && n.length > 0 && n.length <= 12);

/** 2-Player Table head-to-head records: { "ama|kofi": { wins: { ama: 3, kofi: 2 }, draws: 1 } }. */
function rivalriesField(raw) {
  if (!isPlainObject(raw)) return {};
  const rivalries = Object.fromEntries(Object.entries(raw).filter(([, entry]) => isPlainObject(entry) && isCount(entry.draws)
    && isPlainObject(entry.wins) && Object.values(entry.wins).every(isCount)));
  return Object.keys(rivalries).length ? { rivalries } : {};
}

/** Daily Flick record: best flicks per puzzle number, streak and the last day played. */
function dailyField(raw) {
  if (!isPlainObject(raw) || !isCount(raw.streak) || !isCount(raw.lastDay) || !isPlainObject(raw.best)) return {};
  const best = Object.fromEntries(Object.entries(raw.best).filter(([key, value]) => /^\d+$/.test(key) && isCount(value)));
  return { daily: { best, streak: raw.streak, lastDay: raw.lastDay } };
}

export function loadProgress() {
  const fresh = { stars: {}, muted: false };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw);
    return {
      stars: parsed?.stars && typeof parsed.stars === 'object' && !Array.isArray(parsed.stars)
        ? Object.fromEntries(Object.entries(parsed.stars).filter(([, value]) => Number.isInteger(value) && value >= 0 && value <= 3)) : {},
      // ♪ mutes for this visit only: every visit starts with sound on. A saved mute (often a tap on ♪ by a
      // player who heard nothing yet because audio was still locked) would otherwise silence every return.
      muted: false,
      ...(MUSIC_VOLUMES.includes(parsed?.musicVolume) && { musicVolume: parsed.musicVolume }), // Medium when unset
      ...(parsed?.effectsOff === true && { effectsOff: true }),
      ...(typeof parsed?.lastLegendAct === 'string' && { lastLegendAct: parsed.lastLegendAct }),
      ...(parsed?.hudStyle === 'broadcast' && { hudStyle: 'broadcast' }), // chalk is the default
      ...(parsed?.practiceDone === true && { practiceDone: true }), // finished Kwame's Corner once
      ...(parsed?.practiceSkipped === true && { practiceSkipped: true }), // chose "just play" on first launch
      ...(validNames(parsed?.versusNames) && { versusNames: { home: parsed.versusNames.home, away: parsed.versusNames.away } }),
      ...rivalriesField(parsed?.rivalries),
      ...dailyField(parsed?.daily),
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
