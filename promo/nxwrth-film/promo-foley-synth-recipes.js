// Table sounds for the film, synthesised at absolute times on any audio context
// (live or offline), with seeded variation so every run and every export is identical.
// The recipes mirror the game's contact sounds (same inharmonic metal partials);
// the game's own sound board schedules relative to "now" and uses Math.random,
// which a scrubbing, frame-exported film cannot.
import { createSeededRandom } from '../../src/core/seeded-random-number-generator.js';

const METAL_PARTIALS = [[1, 1], [2.76, 0.5], [5.4, 0.25]];

export function createFoley(ctx, output, seed = 1) {
  const rng = createSeededRandom(seed);
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = rng() * 2 - 1;

  function envelope(t, gain, attack, duration, pan) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + duration);
    if (!pan) { g.connect(output); return g; }
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(panner).connect(output);
    return g;
  }

  function tone(t, { freq, to = freq, duration = 0.1, gain = 0.2, attack = 0.003, pan = 0, type = 'sine' }) {
    if (t < ctx.currentTime - 0.02) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t + duration);
    osc.connect(envelope(t, gain, attack, duration, pan));
    osc.start(t);
    osc.stop(t + attack + duration + 0.05);
  }

  function noise(t, { duration = 0.1, filter = 'bandpass', freq = 1000, to = freq, q = 1, gain = 0.2, attack = 0.002, pan = 0 }) {
    if (t < ctx.currentTime - 0.02) return;
    const src = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    src.buffer = noiseBuffer;
    src.loop = true;
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (to !== freq) f.frequency.exponentialRampToValueAtTime(to, t + duration);
    src.connect(f).connect(envelope(t, gain, attack, duration, pan));
    src.start(t, rng() * 0.9);
    src.stop(t + attack + duration + 0.05);
  }

  const recipes = {
    /** Cap on cap. */
    clink(t, { s = 0.6, pan = 0 } = {}) {
      const g = 0.05 + s * 0.4, base = 1900 + rng() * 900;
      METAL_PARTIALS.forEach(([ratio], i) => tone(t, { freq: base * ratio * 0.5, duration: 0.14 / (i + 1) + 0.02, gain: g / (i + 1.5), pan }));
      noise(t, { duration: 0.012, filter: 'highpass', freq: 5000, gain: g * 0.5, pan });
    },
    /** Fingernail off the rim. */
    flick(t, { s = 0.8 } = {}) {
      noise(t, { duration: 0.014, filter: 'highpass', freq: 3600, gain: 0.18 + s * 0.3 });
      tone(t, { freq: 190, to: 95, duration: 0.035, gain: 0.06 + s * 0.12 });
      noise(t + 0.01, { duration: 0.05 + s * 0.05, filter: 'bandpass', freq: 1800, to: 1200, q: 2, gain: 0.03 + s * 0.05 });
    },
    /** Paper ball struck. */
    thwack(t, { s = 0.6, pan = 0 } = {}) {
      noise(t, { duration: 0.03, filter: 'bandpass', freq: 900, q: 1.2, gain: 0.1 + s * 0.2, pan });
      tone(t, { freq: 150, to: 90, duration: 0.04, gain: 0.05 + s * 0.1, pan });
      noise(t + 0.006, { duration: 0.016, filter: 'highpass', freq: 3600, gain: 0.03 + s * 0.05, pan });
    },
    /** Batten or post. */
    knock(t, { s = 0.6, pan = 0 } = {}) {
      tone(t, { freq: 240, to: 160, duration: 0.09, gain: 0.08 + s * 0.16, pan });
      noise(t, { duration: 0.02, filter: 'bandpass', freq: 960, q: 3, gain: 0.05 + s * 0.08, pan });
    },
    /** Metal dragged across the table. */
    scrape(t, { duration = 0.5, gain = 0.07, from = 1500, to = 2300 } = {}) {
      noise(t, { duration, filter: 'bandpass', freq: from, to, q: 2.4, gain, attack: duration * 0.35 });
      noise(t, { duration, filter: 'highpass', freq: 5200, gain: gain * 0.35, attack: duration * 0.5 });
    },
    /** A cap dropped on the table rattles to rest: quickening, fading clinks. */
    settle(t) {
      let at = t, gap = 0.13, level = 0.5;
      for (let i = 0; i < 9; i++) {
        recipes.clink(at, { s: level * 0.5 });
        tone(at, { freq: 210, to: 140, duration: 0.03, gain: level * 0.1 });
        at += gap; gap *= 0.72; level *= 0.78;
      }
    },
    /** A finger pad landing on painted metal. */
    touch(t) {
      noise(t, { duration: 0.03, filter: 'lowpass', freq: 700, gain: 0.07, attack: 0.008 });
      tone(t, { freq: 120, to: 80, duration: 0.05, gain: 0.05 });
    },
    /** Room air: the table under one bulb. */
    air(t, { duration = 3, gain = 0.02 } = {}) {
      noise(t, { duration, filter: 'lowpass', freq: 420, gain, attack: duration * 0.3 });
    },
    /** The title strike: a full metallic KONK with a body and a ring. */
    konk(t, { gain = 1 } = {}) {
      tone(t, { freq: 92, to: 46, duration: 0.32, gain: 0.5 * gain, attack: 0.002 });
      noise(t, { duration: 0.02, filter: 'highpass', freq: 4200, gain: 0.5 * gain });
      for (const [ratio, level] of METAL_PARTIALS) {
        tone(t, { freq: 1180 * ratio, duration: 0.6 / ratio + 0.06, gain: 0.3 * level * gain });
        tone(t, { freq: 1193 * ratio, duration: 0.45 / ratio + 0.05, gain: 0.16 * level * gain }); // beating second cap
      }
      noise(t + 0.004, { duration: 0.11, filter: 'bandpass', freq: 2400, q: 1.4, gain: 0.14 * gain });
    },
  };
  return recipes;
}
