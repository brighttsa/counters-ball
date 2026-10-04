// The soundtrack is the film's clock. Playback position comes from the audio
// context, so picture and beat stay locked through pause, resume, restart,
// scrubbing and dropped frames. The same scheduling renders the mix offline for export.
import { createFoley } from './promo-foley-synth-recipes.js';
import { TRACK_URLS, TRACK_IN, MUSIC_START, MUSIC_OUT, FILM_END, FILM_SEED, TAG, DROP } from './nxwrth-promo-timeline-config.js';

const LEAD_IN = 0.06;        // seconds between pressing play and the first scheduled sample
const MUSIC_LEVEL = 0.92;
const MUSIC_CUT_FADE = 0.07; // the hard cut to black, without a click
const RESYNC = 0.03;         // picture clock is pulled back to the audio clock beyond this drift

export class PromoAudioSync {
  constructor() {
    this.buffer = null;
    this.cues = [];       // [{ t, kind, opts }] in film time
    this.position = 0;    // film seconds while stopped
    this.playing = false;
    this.muted = false;
    this.missingTrack = false;
  }

  async load() {
    for (const url of TRACK_URLS) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        this.encoded = await response.arrayBuffer();
        this.trackUrl = url;
        return;
      } catch { /* try the next source */ }
    }
    this.missingTrack = true; // the film still runs, on the same clock, with table sounds only
    console.warn('NXWRTH soundtrack not found. Playing without music.');
  }

  setCues(cues) {
    // Nothing competes with the producer tag: the voice owns the gap before the drop.
    this.cues = cues.filter((cue) => cue.t < TAG - 0.05 || cue.t >= DROP).sort((a, b) => a.t - b.t);
  }

  async ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.encoded && !this.buffer) this.buffer = await this.ctx.decodeAudioData(this.encoded.slice(0));
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  /** Schedules music and table sounds from film time `from` onto `ctx`, starting at context time `at`. */
  schedule(ctx, output, buffer, from, at) {
    const bus = ctx.createGain();
    bus.connect(output);
    if (buffer && from < MUSIC_OUT) {
      const source = ctx.createBufferSource();
      const level = ctx.createGain();
      source.buffer = buffer;
      level.gain.value = MUSIC_LEVEL;
      const cutAt = at + (MUSIC_OUT - from);
      level.gain.setValueAtTime(MUSIC_LEVEL, Math.max(at, cutAt - MUSIC_CUT_FADE));
      level.gain.linearRampToValueAtTime(0, cutAt);
      source.connect(level).connect(bus);
      if (from < MUSIC_START) source.start(at + (MUSIC_START - from), TRACK_IN);
      else source.start(at, TRACK_IN + (from - MUSIC_START));
      source.stop(cutAt + 0.02);
    }
    const foley = createFoley(ctx, bus, FILM_SEED);
    for (const cue of this.cues) {
      if (cue.t >= from - 0.001) foley[cue.kind](at + (cue.t - from), cue.opts);
    }
    return bus;
  }

  async play() {
    if (this.playing) return;
    if (this.position >= FILM_END) this.position = 0;
    await this.ensureContext();
    this.startContextTime = this.ctx.currentTime + LEAD_IN;
    this.startFilmTime = this.position;
    this.startWallTime = performance.now() + LEAD_IN * 1000;
    this.bus = this.schedule(this.ctx, this.master, this.buffer, this.position, this.startContextTime);
    this.playing = true;
  }

  pause() {
    if (!this.playing) return;
    this.position = this.time;
    this.playing = false;
    const bus = this.bus, now = this.ctx.currentTime;
    bus.gain.setValueAtTime(1, now);
    bus.gain.linearRampToValueAtTime(0, now + 0.03);
    setTimeout(() => bus.disconnect(), 80); // silences everything still scheduled on it
  }

  async seek(filmSeconds) {
    const resume = this.playing;
    this.pause();
    this.position = Math.max(0, Math.min(FILM_END, filmSeconds));
    if (resume) await this.play();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 1;
  }

  /** Film seconds. Smooth between audio callbacks, never drifting from the audio clock. */
  get time() {
    if (!this.playing) return this.position;
    const audio = this.startFilmTime + (this.ctx.currentTime - this.startContextTime);
    let wall = this.startFilmTime + (performance.now() - this.startWallTime) / 1000;
    if (Math.abs(wall - audio) > RESYNC) {
      this.startWallTime += (wall - audio) * 1000;
      wall = audio;
    }
    const film = Math.max(this.startFilmTime, wall);
    if (film >= FILM_END) {
      this.playing = false;
      this.position = FILM_END;
      return FILM_END;
    }
    return film;
  }

  /** The complete film mix as a 16-bit stereo WAV, for muxing with exported frames. */
  async renderOfflineWav() {
    const rate = 48000;
    const offline = new OfflineAudioContext(2, Math.ceil(FILM_END * rate), rate);
    const buffer = this.encoded ? await offline.decodeAudioData(this.encoded.slice(0)) : null;
    this.schedule(offline, offline.destination, buffer, 0, 0);
    const mix = await offline.startRendering();
    const frames = mix.length, bytes = new DataView(new ArrayBuffer(44 + frames * 4));
    const text = (offset, value) => [...value].forEach((ch, i) => bytes.setUint8(offset + i, ch.charCodeAt(0)));
    text(0, 'RIFF'); bytes.setUint32(4, 36 + frames * 4, true); text(8, 'WAVEfmt ');
    bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, 2, true);
    bytes.setUint32(24, rate, true); bytes.setUint32(28, rate * 4, true); bytes.setUint16(32, 4, true);
    bytes.setUint16(34, 16, true); text(36, 'data'); bytes.setUint32(40, frames * 4, true);
    const left = mix.getChannelData(0), right = mix.getChannelData(1);
    for (let i = 0; i < frames; i++) {
      bytes.setInt16(44 + i * 4, Math.max(-1, Math.min(1, left[i])) * 32767, true);
      bytes.setInt16(46 + i * 4, Math.max(-1, Math.min(1, right[i])) * 32767, true);
    }
    return new Blob([bytes.buffer], { type: 'audio/wav' });
  }
}
