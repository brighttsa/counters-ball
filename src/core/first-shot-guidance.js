const KEY = 'counters-ball-first-shot-complete';
let completedInMemory = false;

export function needsFirstShotGuidance() {
  if (completedInMemory) return false;
  try { return globalThis.localStorage?.getItem(KEY) !== '1'; }
  catch { return true; }
}

export function completeFirstShotGuidance() {
  completedInMemory = true;
  try { globalThis.localStorage?.setItem(KEY, '1'); }
  catch { /* Keep completion for this visit when storage is unavailable. */ }
}
