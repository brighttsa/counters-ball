const KEY = 'counters-ball-3d/schoolyard-shot-memory-v1';
let rememberedThisSession = false;
const isSchoolyard = level => level.backdrop === 'schoolyard' && level.mechanic?.type === 'ruler-seesaw';

export function remembersSchoolyardBank(storage) {
  try {
    return (storage ?? window.localStorage).getItem(KEY) === 'ruler-bank-win' || rememberedThisSession;
  } catch { return rememberedThisSession; }
}

export function schoolyardReturnMemory(level, mode) {
  return mode === 'legends' && isSchoolyard(level) && remembersSchoolyardBank()
    ? 'Remembered here: your match-winning bounce off the ruler.' : '';
}

export function createSchoolyardShotMemory(level, options, storage) {
  const eligible = isSchoolyard(level) && !options.isAttract && !options.isPreview
    && options.controllers.home === 'human' && options.controllers.away === 'ai';
  let decidingBank = false, finished = false;
  return {
    goal({ scorer, scores }, label) {
      if (finished) return;
      decidingBank = eligible && scorer === 'home' && label === 'OFF THE RULER'
        && scores.home >= level.rules.goalsToWin;
    },
    finish(result) {
      if (finished) return false;
      finished = true;
      if (!decidingBank || result.winner !== 'home') return false;
      const existing = remembersSchoolyardBank(storage);
      rememberedThisSession = true;
      try { (storage ?? window.localStorage).setItem(KEY, 'ruler-bank-win'); }
      catch { /* Private browsing still remembers for this page session. */ }
      return !existing;
    },
  };
}
