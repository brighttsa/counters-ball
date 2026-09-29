import { APPROVED_FOLEY_SAMPLES, forceTier, surfaceSlideKey } from './approved-foley-sample-manifest.js';

const MAX_VOICES = 12;

export class ApprovedFoleyBank {
  constructor({ fetcher = (...args) => fetch(...args), random = Math.random } = {}) {
    this.fetcher = fetcher;
    this.random = random;
    this.buffers = new Map();
    this.loading = null;
    this.voices = new Set();
    this.level = 1;
    this.lastPlayed = null;
  }

  attach(ctx, destination) {
    this.ctx = ctx;
    this.destination = destination;
    if (!this.loading) this.loading = this.preload();
  }

  async preload() {
    const jobs = Object.entries(APPROVED_FOLEY_SAMPLES).flatMap(([key, urls]) => urls.map(async (url) => {
      try {
        const response = await this.fetcher(url);
        if (!response.ok) return;
        const buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
        const pool = this.buffers.get(key) ?? [];
        pool.push(buffer);
        this.buffers.set(key, pool);
      } catch { /* Procedural Foley remains available when a file cannot decode. */ }
    }));
    await Promise.all(jobs);
  }

  setLevel(level) { this.level = Math.max(0, Math.min(1, Number.isFinite(level) ? level : 1)); }

  playImpact(family, strength, options = {}) {
    let key = `${family}-${forceTier(strength)}`;
    if (!this.buffers.has(key) && family === 'cap-cap' && key.endsWith('-light')) return false;
    if (!this.buffers.has(key)) key = `${family}-${strength < 0.5 ? 'medium' : 'hard'}`;
    return this.play(key, { gain: 0.42 + strength * 0.38, ...options });
  }

  playFlick(strength, { surface, dusty, pan = 0 } = {}) {
    const played = this.play(`flick-${forceTier(strength)}`, { gain: 0.5 + strength * 0.32, pan });
    this.play(surfaceSlideKey(surface, dusty), { gain: 0.08 + strength * 0.12, pan, delay: 0.025 });
    return played;
  }

  playPost(strength, options = {}) {
    return this.play(`post-${strength < 0.48 ? 'light' : 'hard'}`, { gain: 0.5 + strength * 0.3, ...options });
  }

  playSlide(strength, { surface, dusty, ...options } = {}) {
    return this.play(surfaceSlideKey(surface, dusty), { gain: 0.035 + strength * 0.1, ...options });
  }

  play(key, { gain = 0.6, pan = 0, delay = 0 } = {}) {
    const pool = this.buffers.get(key);
    if (!this.ctx || !this.destination || !pool?.length || this.voices.size >= MAX_VOICES) return false;
    const source = this.ctx.createBufferSource();
    const variation = Math.floor(this.random() * pool.length);
    source.buffer = pool[variation];
    source.playbackRate.value = 0.985 + this.random() * 0.03;
    const level = this.ctx.createGain();
    level.gain.value = gain * this.level * (0.96 + this.random() * 0.08);
    const nodes = [source, level];
    source.connect(level);
    if (pan && this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      level.connect(panner).connect(this.destination);
      nodes.push(panner);
    } else level.connect(this.destination);
    const voice = { source, nodes };
    this.voices.add(voice);
    source.onended = () => {
      nodes.forEach((node) => node.disconnect());
      this.voices.delete(voice);
    };
    source.start(this.ctx.currentTime + delay);
    this.lastPlayed = { key, variation: variation + 1, gain };
    return true;
  }

  debugSnapshot() {
    return { loaded: [...this.buffers.values()].reduce((sum, pool) => sum + pool.length, 0),
      voices: this.voices.size, lastPlayed: this.lastPlayed };
  }

  dispose() {
    for (const voice of this.voices) {
      voice.source.onended = null;
      try { voice.source.stop(); } catch { /* already stopped */ }
      voice.nodes.forEach((node) => node.disconnect());
    }
    this.voices.clear();
    this.buffers.clear();
    this.ctx = null;
    this.destination = null;
    this.loading = null;
  }
}
