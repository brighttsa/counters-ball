// Environmental noise beds: no simulated speech or invented local music.
export const AMBIENCE_PROFILES = {
  schoolyard: { frequency: 1100, level: 0.018, gust: 0.19, depth: 150 },
  kiosk: { frequency: 480, level: 0.035, gust: 0.23, depth: 120 },
  veranda: { frequency: 1700, level: 0.012, gust: 0.11, depth: 350 },
  roadside: { frequency: 240, level: 0.055, gust: 0.08, depth: 150 },
  harmattan: { frequency: 650, level: 0.06, gust: 0.13, depth: 260 },
  night: { frequency: 850, level: 0.024, gust: 0.09, depth: 280 },
};

export class StreetAmbienceBeds {
  constructor() { this.kind = null; this.nodes = []; this.sources = []; this.heat = 0; }

  attach(ctx, master, noiseBuffer) {
    Object.assign(this, { ctx, master, noiseBuffer });
    this.start(this.kind);
  }

  set(kind) {
    const key = kind === 'day' ? 'kiosk' : kind;
    if (key === this.kind && this.nodes.length) return;
    this.kind = key;
    this.start(key);
  }

  setHeat(heat) {
    this.heat = Number.isFinite(heat) ? Math.max(0, Math.min(1, heat)) : 0;
    this.updateLevel();
  }

  setTension(tension) { this.tension = Boolean(tension); this.updateLevel(); }
  gainScale() { return (1 + this.heat * 0.35) * (this.tension ? 0.6 : 1); }
  updateLevel() {
    if (this.level) this.level.gain.setTargetAtTime(this.baseLevel * this.gainScale(), this.ctx.currentTime, 0.3);
  }

  stop() {
    this.sources.forEach((node) => { try { node.stop(); } catch { /* already stopped */ } });
    this.nodes.forEach((node) => node.disconnect());
    this.nodes = []; this.sources = []; this.level = null;
  }

  start(kind) {
    this.stop();
    const profile = AMBIENCE_PROFILES[kind];
    if (!this.ctx || !profile) return;
    const { ctx, master } = this;
    const bed = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
    const level = ctx.createGain(), gust = ctx.createOscillator(), depth = ctx.createGain();
    bed.buffer = this.noiseBuffer;
    bed.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = profile.frequency;
    level.gain.value = profile.level * this.gainScale();
    gust.frequency.value = profile.gust;
    depth.gain.value = profile.depth;
    bed.connect(filter).connect(level).connect(master);
    gust.connect(depth).connect(filter.frequency);
    this.nodes = [bed, filter, level, gust, depth];
    this.sources = [bed, gust];
    this.level = level;
    this.baseLevel = profile.level;
    bed.start(); gust.start();
  }
}
