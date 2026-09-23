// Sounds of the things on and around the table: caps, coins, bottles, wood,
// paper, cardboard and the goal net. Every musical cue in the game is one of
// these objects being struck, never an imitated instrument, song or voice.
// Each recipe takes the sound board, so voices stay bounded and mutable.

// Approximate inharmonic partial ratios (ratio, relative level) per material;
// they decide whether a strike reads as glass or thin metal.
const GLASS_PARTIALS = [[1, 1], [2.32, 0.45], [4.25, 0.18]];
const METAL_PARTIALS = [[1, 1], [2.76, 0.5], [5.4, 0.25]];
const jitter = (amount) => 1 + (Math.random() * 2 - 1) * amount;

/** A glass bottle tapped with a cap: a clear ring that dies quickly. */
export function bottleTap(board, freq, { gain = 0.12, delay = 0, pan = 0, ring = 0.45 } = {}) {
  board.noise({ duration: 0.008, filter: 'highpass', freq: 6000, gain: gain * 0.5, delay, pan });
  for (const [ratio, level] of GLASS_PARTIALS) {
    board.tone({ freq: freq * ratio * jitter(0.004), duration: ring / (ratio * 0.9), gain: gain * level, delay, pan });
  }
}

/** A coin or cap edge rung against another: brighter and longer than a clink. */
export function coinRing(board, freq, { gain = 0.1, delay = 0, pan = 0 } = {}) {
  board.noise({ duration: 0.01, filter: 'highpass', freq: 5200, gain: gain * 0.6, delay, pan });
  for (const [ratio, level] of METAL_PARTIALS) {
    board.tone({ freq: freq * ratio * jitter(0.01), duration: 0.32 / ratio, gain: gain * level, delay, pan });
  }
}

/** Knuckle on the wooden table frame: a pitched body under a short woody click. */
export function tableKnock(board, freq, { gain = 0.2, delay = 0, pan = 0 } = {}) {
  board.tone({ freq: freq * jitter(0.04), to: freq * 0.66, duration: 0.09, gain, delay, pan });
  board.noise({ duration: 0.02, filter: 'bandpass', freq: freq * 4, q: 3, gain: gain * 0.55, delay, pan });
}

/** The paper ball's skin crumpling on a firm hit: a few tiny dry grains. */
export function paperCrinkle(board, strength, pan = 0) {
  const grains = strength > 0.6 ? 3 : 2;
  for (let i = 0; i < grains; i++) {
    board.noise({ duration: 0.012 + Math.random() * 0.012, filter: 'highpass', freq: 3200 + Math.random() * 2400,
      gain: 0.03 + strength * 0.06, delay: 0.004 + Math.random() * 0.05, pan });
  }
}

/** A finger tapping a cardboard sign: the menus are posted notices, not a device. */
export function cardboardTap(board, weight = 1) {
  board.noise({ duration: 0.022, filter: 'bandpass', freq: 1100 * jitter(0.08), q: 1.6, gain: 0.14 * weight });
  board.tone({ freq: 260 * jitter(0.05), to: 170, duration: 0.03, gain: 0.1 * weight });
}

/** The ball settling into the goal net: soft cloth give under a muted thump. */
export function netCatch(board, pan = 0) {
  board.noise({ duration: 0.28, filter: 'lowpass', freq: 1400, to: 380, gain: 0.34, attack: 0.012, pan });
  board.tone({ freq: 120, to: 70, duration: 0.08, gain: 0.22, pan });
}
