import { bottleTap, coinRing, tableKnock, cardboardTap } from './table-object-sound-recipes.js';

export const normalizedStrength = (value) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;

// Named moments, each voiced by an object on the table being struck. No
// imitated local music or recorded voices: bottles, coins, caps and wood only.
const CUES = {
  aimStart: (board, s) => board.noise({ duration: 0.008, filter: 'highpass', freq: 4200, gain: 0.025 + s * 0.03 }),
  uiConfirm: (board) => cardboardTap(board, 1.4),
  hardContact: (board, s) => {
    board.tone({ freq: 160, to: 80, duration: 0.09, gain: 0.04 + s * 0.12 });
    board.noise({ freq: 2400 + s * 2000, duration: 0.018, gain: 0.08 + s * 0.18 });
  },
  // A clean strike makes the cap ring like a coin.
  sweetSpot: (board, s) => coinRing(board, 2600, { gain: 0.12 + s * 0.1 }),
  // Knock-knock on the frame: low then high, the defender turning it round.
  counter: (board, s) => {
    tableKnock(board, 150, { gain: 0.06 + s * 0.05 });
    tableKnock(board, 230, { gain: 0.06 + s * 0.05, delay: 0.09 });
  },
  // Three bottles struck upward: the whole table noticed.
  streetPlay: (board, s) => [660, 784, 988].forEach((f, i) => bottleTap(board, f, { gain: 0.04 + s * 0.025, delay: i * 0.075 })),
  // Two slow, heavy knocks: someone is one goal away.
  matchPoint: (board) => {
    tableKnock(board, 110, { gain: 0.18 });
    tableKnock(board, 110, { gain: 0.15, delay: 0.32 });
  },
  // Bottles struck up the line, closing on a coin ring.
  win: (board) => {
    [523, 659, 784, 1047].forEach((f, i) => bottleTap(board, f, { gain: 0.08, delay: i * 0.11, ring: 0.6 }));
    coinRing(board, 2100, { gain: 0.05, delay: 0.46 });
  },
};

// Older names still used by callers for plain contact sounds.
const LEGACY = { uiHover: 'uiTick', flickRelease: 'flick', softContact: 'ballTap', bank: 'woodKnock' };

export function playSoundEvent(sound, name, strength = 0.5) {
  const s = normalizedStrength(strength);
  if (Object.hasOwn(LEGACY, name)) { sound[LEGACY[name]](s); return; }
  const cue = Object.hasOwn(CUES, name) ? CUES[name] : null;
  if (!cue || !sound.can(`event-${name}`, name === 'hardContact' ? 28 : 100)) return;
  cue(sound, s);
}

export const SOUND_EVENT_NAMES = [...Object.keys(CUES), ...Object.keys(LEGACY)];
