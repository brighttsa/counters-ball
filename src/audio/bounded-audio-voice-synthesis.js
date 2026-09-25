const HIDE_FADE = 0.4;      // seconds: music fades out before the context suspends
const SHOW_FADE = 0.8;      // seconds: music fades back in after the context resumes
const HIDE_LPF_END = 200;   // Hz: low-pass cutoff at the end of the hide fade ("going to sleep")
const PAUSE_FADE = 0.12;    // seconds: effects fade out on pause, quicker than a tab hide but never a hard cut
const PAUSE_MUSIC_DIP = 0.5; // about −6 dB: the music carries on under the pause menu

// Sources are single-use Web Audio nodes; reusable buffers and a hard voice
// limit bound allocation, and every ended voice disconnects its entire chain.
export class BoundedAudioVoiceSynthesis {
  constructor() { this.voices = new Set(); this.paused = false; this.hidden = false; this._hideTimer = null; }

  track(source, nodes) {
    const voice = { source, nodes };
    this.voices.add(voice);
    source.onended = () => {
      nodes.forEach((node) => node.disconnect());
      this.voices.delete(voice);
    };
  }

  // Button clicks (uiVoice) stay available on the pause menu; everything else waits for play to resume.
  available() { return this.ctx && !this.muted && !this.effectsOff && (!this.paused || this.uiVoice) && this.voices.size < 32; }

  /** Gain envelope into the master bus; a non-zero pan places the voice left/right of centre. */
  envelope(level, start, attack, duration, pan = 0) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, level * this.sfxLevel), start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + attack + duration);
    const bus = this.uiVoice && this.uiBus ? this.uiBus : this.master; // button clicks skip the paused effects bus
    if (!pan) {
      g.connect(bus);
      return { input: g, nodes: [g] };
    }
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(panner).connect(bus);
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

  /** A hidden tab fades out gracefully, then suspends; a visible tab resumes and fades back in. */
  setHidden(hidden) {
    this.hidden = Boolean(hidden);
    clearTimeout(this._hideTimer);
    if (!this.ctx) return;
    if (this.hidden) {
      this._fadeForHide();
    } else {
      this.ctx.resume()?.catch(() => {});
      if (!this.paused) this._fadeForShow();
    }
  }

  /**
   * Pause silences the effects but keeps the context running, so the music plays on quietly under the pause
   * menu. Suspending the context froze the music and, on some headphone outputs, left the frozen last sample
   * buzzing for as long as the menu stayed open.
   */
  setPaused(paused) {
    this.paused = Boolean(paused);
    if (!this.ctx || this.hidden) return;
    if (this.paused) {
      this._fadeForHide(PAUSE_FADE, { suspend: false, muffle: false });
      this.music?.setDip?.(PAUSE_MUSIC_DIP, 0.4);
    } else {
      this.ctx.resume()?.catch(() => {});
      this._fadeForShow(PAUSE_FADE * 2);
      this.music?.setDip?.(1, 0.4);
    }
  }

  _ensureHideFilter() {
    if (this._hideLpf) return this._hideLpf;
    if (!this.ctx || !this.compressor) return null;
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = this.ctx.sampleRate / 2;
    lpf.Q.value = 0.7;
    this.compressor.disconnect();
    this.compressor.connect(lpf).connect(this.ctx.destination);
    this._hideLpf = lpf;
    return lpf;
  }

  _fadeForHide(fade = HIDE_FADE, { suspend = true, muffle = true } = {}) {
    const lpf = muffle ? this._ensureHideFilter() : null; // pause keeps button clicks bright
    const now = this.ctx.currentTime;
    if (this.master) {
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0, now + fade);
    }
    if (lpf) {
      lpf.frequency.cancelScheduledValues(now);
      lpf.frequency.setValueAtTime(lpf.frequency.value, now);
      lpf.frequency.exponentialRampToValueAtTime(HIDE_LPF_END, now + fade);
    }
    clearTimeout(this._hideTimer);
    if (suspend) this._hideTimer = setTimeout(() => this.ctx?.suspend()?.catch(() => {}), fade * 1000 + 50);
  }

  _fadeForShow(fade = SHOW_FADE) {
    const lpf = this._hideLpf?.frequency.value < this.ctx.sampleRate / 4 ? this._hideLpf : null; // only if muffled
    const now = this.ctx.currentTime;
    const level = this.muted || this.effectsOff ? 0 : 0.9;
    if (this.master) {
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(0.0001, now);
      this.master.gain.linearRampToValueAtTime(level, now + fade);
    }
    if (lpf) {
      lpf.frequency.cancelScheduledValues(now);
      lpf.frequency.setValueAtTime(HIDE_LPF_END, now);
      lpf.frequency.exponentialRampToValueAtTime(this.ctx.sampleRate / 2, now + fade);
    }
  }

  dispose() {
    clearTimeout(this._hideTimer);
    this.ambience.stop();
    for (const { source, nodes } of this.voices) {
      source.onended = null;
      try { source.stop(); } catch { /* already ended */ }
      nodes.forEach((node) => node.disconnect());
    }
    this.voices.clear();
    this.master?.disconnect();
    this.uiBus?.disconnect();
    this.uiBus = null;
    this._hideLpf?.disconnect();
    this.compressor?.disconnect();
    this.ctx?.close()?.catch(() => {});
    this.ctx = null;
    this.ambience.ctx = null;
    this.ambience.master = null;
    this.ambience.noiseBuffer = null;
    this.master = null;
    this.compressor = null;
    this._hideLpf = null;
    this.noiseBuffer = null;
    this.last = {};
  }
}
