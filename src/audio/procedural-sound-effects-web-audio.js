// Every sound synthesised live with Web Audio — zero audio files. Metal cap
// clinks (inharmonic partials), paper-ball thwacks, batten knocks, glass
// tinks, a pea whistle, the goal net and struck-bottle stars. Contact effects
// take a strength in 0..1 so a paper ball and a steel cap compare fairly, and
// a pan in -1..1 so each contact sounds from where it happened on screen.
import { StreetAmbienceBeds } from './street-ambience-beds-web-audio.js';
import { VenueAmbientEventScheduler } from './venue-ambient-event-scheduler.js';
import { MatchMomentumLayer } from './match-momentum-rhythmic-tension-layer.js';
import { BoundedAudioVoiceSynthesis } from './bounded-audio-voice-synthesis.js';
import { playSoundEvent, normalizedStrength } from './semantic-sound-event-mapping.js';
import { bottleTap, cardboardTap, netCatch, paperCrinkle } from './table-object-sound-recipes.js';

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
    this.venueEvents = new VenueAmbientEventScheduler();
    this.momentum = new MatchMomentumLayer();
  }

  /** Must be called from a user gesture before anything is audible. */
  unlock() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted || this.effectsOff ? 0 : MASTER_LEVEL;
        this.compressor = this.ctx.createDynamicsCompressor();
        this.master.connect(this.compressor).connect(this.ctx.destination);
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * NOISE_SECONDS, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.noiseBuffer = buffer;
        this.ambience.attach(this.ctx, this.master, buffer);
        this.venueEvents.attach(this.ctx, this.master);
        this.momentum.attach(this.ctx, this.master);
      }
      this.music?.attach(this.ctx); // the soundtrack shares the context on its own bus
      this.setPaused(this.paused);
    } catch {
      this.dispose(); // audio unavailable: the game stays playable in silence
    }
  }

  setMuted(muted) {
    this.muted = muted;
    this.applyMasterLevel();
  }

  /** Effects only (contacts, whistles, street ambience); the music has its own bus and control. */
  setEffectsOff(off) {
    this.effectsOff = Boolean(off);
    this.applyMasterLevel();
    this.venueEvents.setPaused(Boolean(off));
    this.momentum.setPaused(Boolean(off));
  }

  applyMasterLevel() {
    this.master?.gain.setTargetAtTime(this.muted || this.effectsOff ? 0 : MASTER_LEVEL, this.ctx.currentTime, 0.05);
  }

  setSfxLevel(level) {
    this.sfxLevel = normalizedStrength(level);
  }

  setAmbience(kind) {
    this.ambience.set(kind);
    this.venueEvents.set(kind === 'day' ? 'kiosk' : kind);
  }

  /** Start/stop the momentum layer with the match lifecycle. */
  startMomentum() { this.momentum.start(); }
  stopMomentum() { this.momentum.stop(); }

  setPaused(paused) {
    super.setPaused(paused);
    this.venueEvents.setPaused(Boolean(paused));
  }

  event(name, strength = 0.5) { playSoundEvent(this, name, strength); }
  setHeat(value) {
    const v = normalizedStrength(value);
    this.ambience.setHeat(v);
    this.momentum.setHeat(v);
  }
  setTension(value) {
    this.ambience.setTension(Boolean(value));
    this.momentum.setTension(Boolean(value));
  }

  can(key, gapMs = 28) {
    if (!this.available()) return false;
    const now = this.ctx.currentTime * 1000;
    if (now - (this.last[key] ?? -1e9) < gapMs) return false;
    this.last[key] = now;
    return true;
  }

  /** Fingernail off the cap's rim: a dry snap, the cap's small thump, a scrape as it leaves. */
  flick(s) {
    if (!this.can('flick', 60)) return;
    this.noise({ duration: 0.014, filter: 'highpass', freq: 3600, gain: 0.18 + s * 0.3 });
    this.tone({ freq: 190, to: 95, duration: 0.035, gain: 0.06 + s * 0.12 });
    this.noise({ duration: 0.05 + s * 0.05, filter: 'bandpass', freq: 1800, to: 1200, q: 2, gain: 0.03 + s * 0.05, delay: 0.01 });
  }

  capClink(s, pan = 0, surface = 'cap') {
    if (!this.can('clink')) return;
    const g = 0.05 + s * 0.4;
    const base = surface === 'stone' ? 1400 + Math.random() * 400
      : surface === 'wood' ? 1600 + Math.random() * 600
      : 1900 + Math.random() * 900;
    const ring = surface === 'stone' ? 0.08 : surface === 'wood' ? 0.1 : 0.14;
    const brightness = surface === 'stone' ? 3500 : surface === 'wood' ? 4200 : 5000;
    [1, 2.76, 5.4].forEach((ratio, i) => this.tone({ freq: base * ratio * 0.5 * (1 + (Math.random() - 0.5) * 0.02),
      duration: ring / (i + 1) + 0.02, gain: g / (i + 1.5), pan }));
    this.noise({ duration: 0.012, filter: 'highpass', freq: brightness, gain: g * 0.5, pan });
    if (surface === 'wood') this.tone({ freq: 160 + Math.random() * 40, to: 100, duration: 0.04, gain: g * 0.15, pan });
    if (surface === 'stone') this.noise({ duration: 0.02, filter: 'bandpass', freq: 1800, q: 3, gain: g * 0.2, pan });
  }

  /** Cap into the paper ball: a papery thwack, with the skin crinkling on firmer hits. */
  ballTap(s, pan = 0, surface = 'cardboard') {
    if (!this.can('tap')) return;
    const g = 0.08 + s * 0.5;
    const bodyFreq = surface === 'wood' ? 170 : surface === 'cardboard' ? 210 : 240;
    const filterFreq = surface === 'wood' ? 600 + s * 2000 : 800 + s * 2400;
    this.noise({ duration: 0.05, filter: 'lowpass', freq: filterFreq, gain: g, pan });
    this.tone({ freq: bodyFreq * (0.94 + Math.random() * 0.12), to: bodyFreq * 0.52, duration: 0.06, gain: g * 0.45, pan });
    if (s > 0.3) paperCrinkle(this, s, pan);
    if (surface === 'wood' && s > 0.4) this.tone({ freq: 120, to: 80, duration: 0.05, gain: g * 0.12, pan });
  }

  woodKnock(s, pan = 0, surface = 'wood') {
    if (!this.can('knock', 40)) return;
    const g = 0.04 + s * 0.4;
    const baseFreq = surface === 'cardboard' ? 150 + Math.random() * 30 : 190 + Math.random() * 50;
    const noiseFreq = surface === 'cardboard' ? 550 : 750;
    const dur = surface === 'cardboard' ? 0.06 : 0.08;
    this.tone({ freq: baseFreq, to: baseFreq * 0.63, duration: dur, gain: g, pan });
    this.noise({ duration: 0.025, filter: 'bandpass', freq: noiseFreq, q: surface === 'cardboard' ? 2 : 3, gain: g * 0.6, pan });
  }

  stoneClack(s, pan = 0) {
    if (!this.can('stone')) return;
    const g = 0.06 + s * 0.35;
    this.noise({ duration: 0.03, filter: 'bandpass', freq: 2200 * (0.9 + Math.random() * 0.2), q: 5, gain: g, pan });
    this.tone({ freq: 980, to: 700, duration: 0.04, gain: g * 0.4, pan });
  }

  glassTink(s, pan = 0) {
    if (!this.can('glass', 60)) return;
    bottleTap(this, 1500 + Math.random() * 300, { gain: 0.05 + s * 0.25, pan, ring: 0.4 });
  }

  netCatch(pan = 0) {
    if (!this.can('net', 400)) return;
    netCatch(this, pan);
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

  slowMoWhoosh() {
    if (!this.can('whoosh', 500)) return;
    this.noise({ duration: 0.5, freq: 400, to: 1400, q: 1.2, gain: 0.12, attack: 0.08 });
  }

  /** Each star is a bottle struck a step higher, as if lined up along the table's edge. */
  starDing(index) {
    if (!this.ctx || this.muted) return;
    const f = [880, 988, 1175][index] ?? 1175;
    bottleTap(this, f, { gain: 0.16, ring: 0.7 });
  }

  uiTick() {
    if (!this.can('ui', 40)) return;
    cardboardTap(this);
  }

  uiSelect() {
    if (!this.can('ui', 40)) return;
    cardboardTap(this, 1.4);
  }

  uiLocked() {
    if (!this.can('ui', 40)) return;
    this.tone({ freq: 140, to: 90, duration: 0.06, gain: 0.08 });
    this.noise({ duration: 0.018, filter: 'lowpass', freq: 800, gain: 0.06 });
  }

  dispose() {
    this.venueEvents.dispose();
    this.momentum.dispose();
    super.dispose();
  }
}
