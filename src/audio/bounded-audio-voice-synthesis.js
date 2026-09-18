// Sources are single-use Web Audio nodes; reusable buffers and a hard voice
// limit bound allocation, and every ended voice disconnects its entire chain.
export class BoundedAudioVoiceSynthesis {
  constructor() { this.voices = new Set(); this.paused = false; }

  track(source, nodes) {
    const voice = { source, nodes };
    this.voices.add(voice);
    source.onended = () => {
      nodes.forEach((node) => node.disconnect());
      this.voices.delete(voice);
    };
  }

  available() { return this.ctx && !this.muted && !this.paused && this.voices.size < 32; }

  envelope(level, start, attack, duration) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, level * this.sfxLevel), start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + attack + duration);
    g.connect(this.master);
    return g;
  }

  tone({ freq, to = freq, duration = 0.1, type = 'sine', gain = 0.2, attack = 0.003, delay = 0 }) {
    if (!this.available()) return null;
    const t0 = this.ctx.currentTime + delay, osc = this.ctx.createOscillator();
    const envelope = this.envelope(gain, t0, attack, duration);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);
    osc.connect(envelope);
    this.track(osc, [osc, envelope]);
    osc.start(t0);
    osc.stop(t0 + attack + duration + 0.05);
    return { osc, t0 };
  }

  noise({ duration = 0.1, filter = 'bandpass', freq = 1000, to = freq, q = 1, gain = 0.2, attack = 0.002, delay = 0 }) {
    if (!this.available()) return;
    const t0 = this.ctx.currentTime + delay, src = this.ctx.createBufferSource();
    const f = this.ctx.createBiquadFilter(), envelope = this.envelope(gain, t0, attack, duration);
    src.buffer = this.noiseBuffer;
    src.loop = true;
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t0);
    if (to !== freq) f.frequency.exponentialRampToValueAtTime(to, t0 + duration);
    src.connect(f).connect(envelope);
    this.track(src, [src, f, envelope]);
    src.start(t0);
    src.stop(t0 + attack + duration + 0.05);
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
    if (!this.ctx) return;
    const action = this.paused ? this.ctx.suspend() : this.ctx.resume();
    action?.catch(() => {});
  }

  dispose() {
    this.ambience.stop();
    for (const { source, nodes } of this.voices) {
      source.onended = null;
      try { source.stop(); } catch { /* already ended */ }
      nodes.forEach((node) => node.disconnect());
    }
    this.voices.clear();
    this.master?.disconnect();
    this.compressor?.disconnect();
    this.ctx?.close()?.catch(() => {});
    this.ctx = null;
    this.ambience.ctx = null;
    this.ambience.master = null;
    this.ambience.noiseBuffer = null;
    this.master = null;
    this.compressor = null;
    this.noiseBuffer = null;
    this.last = {};
  }
}
