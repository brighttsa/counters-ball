// Sources are single-use Web Audio nodes; reusable buffers and a hard voice
// limit bound allocation, and every ended voice disconnects its entire chain.
export class BoundedAudioVoiceSynthesis {
  constructor() { this.voices = new Set(); this.paused = false; this.hidden = false; }

  track(source, nodes) {
    const voice = { source, nodes };
    this.voices.add(voice);
    source.onended = () => {
      nodes.forEach((node) => node.disconnect());
      this.voices.delete(voice);
    };
  }

  available() { return this.ctx && !this.muted && !this.effectsOff && !this.paused && this.voices.size < 32; }

  /** Gain envelope into the master bus; a non-zero pan places the voice left/right of centre. */
  envelope(level, start, attack, duration, pan = 0) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, level * this.sfxLevel), start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + attack + duration);
    if (!pan) {
      g.connect(this.master);
      return { input: g, nodes: [g] };
    }
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(panner).connect(this.master);
    return { input: g, nodes: [g, panner] };
  }

  tone({ freq, to = freq, duration = 0.1, type = 'sine', gain = 0.2, attack = 0.003, delay = 0, pan = 0 }) {
    if (!this.available()) return null;
    const t0 = this.ctx.currentTime + delay, osc = this.ctx.createOscillator();
    const envelope = this.envelope(gain, t0, attack, duration, pan);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);
    osc.connect(envelope.input);
    this.track(osc, [osc, ...envelope.nodes]);
    osc.start(t0);
    osc.stop(t0 + attack + duration + 0.05);
    return { osc, t0 };
  }

  noise({ duration = 0.1, filter = 'bandpass', freq = 1000, to = freq, q = 1, gain = 0.2, attack = 0.002, delay = 0, pan = 0 }) {
    if (!this.available()) return;
    const t0 = this.ctx.currentTime + delay, src = this.ctx.createBufferSource();
    const f = this.ctx.createBiquadFilter(), envelope = this.envelope(gain, t0, attack, duration, pan);
    src.buffer = this.noiseBuffer;
    src.loop = true;
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t0);
    if (to !== freq) f.frequency.exponentialRampToValueAtTime(to, t0 + duration);
    src.connect(f).connect(envelope.input);
    this.track(src, [src, f, ...envelope.nodes]);
    // A random read position gives every hit its own grain instead of one repeated texture.
    src.start(t0, Math.random() * (src.buffer.duration || 0));
    src.stop(t0 + attack + duration + 0.05);
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
    this.applySuspension();
  }

  /** A hidden tab goes quiet (music included) and picks up where it was when shown again. */
  setHidden(hidden) {
    this.hidden = Boolean(hidden);
    this.applySuspension();
  }

  applySuspension() {
    if (!this.ctx) return;
    const action = this.paused || this.hidden ? this.ctx.suspend() : this.ctx.resume();
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
