// Every sound synthesised live with Web Audio — zero audio files. Metal cap
// clinks (inharmonic partials), paper-ball thwacks, batten knocks, glass
// tinks, a pea whistle, crowd swell and star dings. All contact effects take
// a strength in 0..1 so a paper ball and a steel cap compare fairly.
import { StreetAmbienceBeds } from './street-ambience-beds-web-audio.js';
import { BoundedAudioVoiceSynthesis } from './bounded-audio-voice-synthesis.js';
import { playSoundEvent, normalizedStrength } from './semantic-sound-event-mapping.js';

const NOISE_SECONDS = 1;
const MASTER_LEVEL = 0.9;

export class ProceduralSoundBoard extends BoundedAudioVoiceSynthesis {
  constructor({ muted = false } = {}) {
    super();
    this.ctx = null;
    this.muted = muted;
    this.sfxLevel = 1;
    this.last = {};
    this.ambience = new StreetAmbienceBeds();
  }

  /** Must be called from a user gesture before anything is audible. */
  unlock() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : MASTER_LEVEL;
        this.compressor = this.ctx.createDynamicsCompressor();
        this.master.connect(this.compressor).connect(this.ctx.destination);
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * NOISE_SECONDS, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.noiseBuffer = buffer;
        this.ambience.attach(this.ctx, this.master, buffer);
      }
      this.setPaused(this.paused);
    } catch {
      this.dispose(); // audio unavailable: the game stays playable in silence
    }
  }

  setMuted(muted) {
    this.muted = muted;
    this.master?.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, this.ctx.currentTime, 0.05);
  }

  setSfxLevel(level) {
    this.sfxLevel = normalizedStrength(level);
  }

  setAmbience(kind) {
    this.ambience.set(kind);
  }

  event(name, strength = 0.5) { playSoundEvent(this, name, strength); }
  setHeat(value) { this.ambience.setHeat(normalizedStrength(value)); }
  setTension(value) { this.ambience.setTension(Boolean(value)); }

  can(key, gapMs = 28) {
    if (!this.available()) return false;
    const now = this.ctx.currentTime * 1000;
    if (now - (this.last[key] ?? -1e9) < gapMs) return false;
    this.last[key] = now;
    return true;
  }

  flick(s) {
    if (!this.can('flick', 60)) return;
    this.noise({ duration: 0.04, filter: 'highpass', freq: 2600, gain: 0.2 + s * 0.35 }); // fingernail snap
    this.tone({ freq: 1500, to: 420, duration: 0.05, type: 'triangle', gain: 0.08 + s * 0.1 });
  }

  capClink(s) {
    if (!this.can('clink')) return;
    const g = 0.05 + s * 0.4, base = 1900 + Math.random() * 900;
    [1, 2.76, 5.4].forEach((ratio, i) => this.tone({ freq: base * ratio * 0.5, duration: 0.14 / (i + 1) + 0.02, gain: g / (i + 1.5) }));
    this.noise({ duration: 0.012, filter: 'highpass', freq: 5000, gain: g * 0.5 });
  }

  ballTap(s) {
    if (!this.can('tap')) return;
    const g = 0.08 + s * 0.5;
    this.noise({ duration: 0.05, filter: 'lowpass', freq: 800 + s * 2400, gain: g });
    this.tone({ freq: 210, to: 110, duration: 0.06, gain: g * 0.45 });
  }

  woodKnock(s) {
    if (!this.can('knock', 40)) return;
    const g = 0.04 + s * 0.4;
    this.tone({ freq: 190 + Math.random() * 50, to: 120, duration: 0.08, gain: g });
    this.noise({ duration: 0.025, filter: 'bandpass', freq: 750, q: 3, gain: g * 0.6 });
  }

  stoneClack(s) {
    if (!this.can('stone')) return;
    const g = 0.06 + s * 0.35;
    this.noise({ duration: 0.03, filter: 'bandpass', freq: 2200, q: 5, gain: g });
    this.tone({ freq: 980, to: 700, duration: 0.04, type: 'triangle', gain: g * 0.4 });
  }

  glassTink(s) {
    if (!this.can('glass', 60)) return;
    const g = 0.05 + s * 0.3;
    this.tone({ freq: 3150, duration: 0.35, gain: g });
    this.tone({ freq: 4730, duration: 0.22, gain: g * 0.5 });
  }

  whistle() {
    if (!this.can('whistle', 400)) return;
    for (const [delay, length] of [[0, 0.16], [0.24, 0.42]]) {
      if (this.voices.size > 29) break;
      const voice = this.tone({ freq: 2750, duration: length, gain: 0.14, attack: 0.01, delay });
      if (!voice) break;
      const { osc, t0 } = voice;
      const lfo = this.ctx.createOscillator();
      const depth = this.ctx.createGain();
      lfo.frequency.value = 38; // the pea rattling inside
      depth.gain.value = 140;
      lfo.connect(depth).connect(osc.frequency);
      this.track(lfo, [lfo, depth]);
      lfo.start(t0);
      lfo.stop(t0 + length + 0.1);
      this.noise({ duration: length, freq: 2750, q: 8, gain: 0.04, delay });
    }
  }

  goalCheer() {
    if (!this.can('cheer', 800)) return;
    this.noise({ duration: 2.4, freq: 700, to: 1100, q: 0.7, gain: 0.3, attack: 0.25 });
    for (let i = 0; i < 7; i++) {
      this.tone({ freq: 420 + Math.random() * 300, to: 800 + Math.random() * 500, duration: 0.25 + Math.random() * 0.3,
        type: 'triangle', gain: 0.04, attack: 0.04, delay: 0.1 + Math.random() * 1.2 });
    }
  }

  groan() {
    if (!this.can('groan', 800)) return;
    this.noise({ duration: 1.3, filter: 'lowpass', freq: 900, to: 280, gain: 0.2, attack: 0.08 });
    this.tone({ freq: 240, to: 150, duration: 0.9, type: 'triangle', gain: 0.05, attack: 0.1 });
  }

  slowMoWhoosh() {
    if (!this.can('whoosh', 500)) return;
    this.noise({ duration: 0.5, freq: 400, to: 1400, q: 1.2, gain: 0.12, attack: 0.08 });
  }

  starDing(index) {
    if (!this.ctx || this.muted) return;
    const f = [1319, 1568, 2093][index] ?? 2093;
    this.tone({ freq: f, duration: 0.55, type: 'triangle', gain: 0.2 });
    this.tone({ freq: f * 2, duration: 0.3, gain: 0.06 });
  }

  uiTick() {
    if (!this.can('ui', 40)) return;
    this.tone({ freq: 1700, to: 1100, duration: 0.035, type: 'triangle', gain: 0.07 });
  }
}
