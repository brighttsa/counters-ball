// The one place music is started, changed and stopped. Screens ask for a track with request(); asking for
// the track already playing does nothing, so turn changes, goals, retries and rapid menu hops never restart
// or double it, and a different track crossfades in while the old one fades out and is released.
//
// Music runs on the sound board's AudioContext but on its own bus straight to the speakers, beside (not
// through) the effects master, so music and effects have separate controls. Pause suspends that context, so
// the music freezes where it is and resumes from the same spot. Tracks are fetched only when first needed and
// decoded at 32 kHz (128 kbps MP3 carries nothing above ~17 kHz), which roughly halves their memory; at most
// two stay decoded (the menu track and one match track), so going back and forth never waits on a decode.
import { SOUNDTRACK } from './soundtrack-track-list-and-screen-routing.js';
import { bakeLoopSeam } from './soundtrack-loop-seam.js';

const DECODE_RATE = 32000;
const MUSIC_BASE_LEVEL = 0.32;   // loud masters (about −14.5 LUFS) sit well under the flicks and contacts
const SWITCH_FADE = 1.2;         // seconds: one track hands over to the next
const RESULTS_DIP = 0.63;        // about −4 dB under the results card
const GOAL_DIP = 0.5;            // about −6 dB while the whistle, the net and the slow motion play
const GOAL_DIP_SECONDS = 2.5;
const KEEP_DECODED = 2;

function defaultDecode(bytes, ctx) {
  const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  const target = Offline ? new Offline(2, 1, DECODE_RATE) : ctx;
  // Older Safari only has the callback form.
  return new Promise((resolve, reject) => {
    const pending = target.decodeAudioData(bytes, resolve, reject);
    pending?.then?.(resolve, reject);
  });
}

async function defaultFetch(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.arrayBuffer();
}

export class SoundtrackDirector {
  constructor({ tracks = SOUNDTRACK, fetchBytes = defaultFetch, decode = defaultDecode } = {}) {
    Object.assign(this, { tracks, fetchBytes, decode });
    this.ctx = null;
    this.volume = 0.7;
    this.muted = false;
    this.wanted = null;     // { id, dip } most recently asked for
    this.voice = null;      // { id, source, gain } playing (or fading in)
    this.decoded = new Map(); // id → Promise<AudioBuffer>, most recently used last
    this.token = 0;
    this.warned = false;
  }

  /** Called once the sound board has an unlocked AudioContext (a user gesture). */
  attach(ctx) {
    if (!ctx || ctx === this.ctx) return;
    this.ctx = ctx;
    this.level = ctx.createGain();
    this.dip = ctx.createGain();
    this.level.connect(this.dip).connect(ctx.destination);
    this.applyLevel(0);
    if (this.wanted) this.start(this.wanted.id, this.wanted.dip);
  }

  get playing() { return this.voice?.id ?? null; }

  setVolume(volume) { this.volume = Math.max(0, Math.min(1, Number(volume) || 0)); this.applyLevel(); }
  setMuted(muted) { this.muted = Boolean(muted); this.applyLevel(); }

  applyLevel(glide = 0.15) {
    if (!this.ctx) return;
    const target = this.muted ? 0 : this.volume * MUSIC_BASE_LEVEL;
    this.level.gain.cancelScheduledValues(this.ctx.currentTime);
    if (glide) this.level.gain.setTargetAtTime(target, this.ctx.currentTime, glide / 3);
    else this.level.gain.value = target;
  }

  /** Ask for a track (null for silence). Idempotent: the same track keeps playing untouched. */
  request(id, { dip = false } = {}) {
    this.wanted = { id, dip };
    if (!this.ctx) return;
    this.setDip(dip ? RESULTS_DIP : 1, 0.6);
    if (this.voice?.id === id && id) return;
    this.start(id, dip);
  }

  start(id, dip) {
    const token = ++this.token;
    this.fadeOut(this.voice);
    this.voice = null;
    this.setDip(dip ? RESULTS_DIP : 1, 0.6);
    const track = id && this.tracks[id];
    if (!track) return;
    this.load(id).then((buffer) => {
      if (token !== this.token || !this.ctx) return; // the player moved on while it loaded
      const source = this.ctx.createBufferSource(), gain = this.ctx.createGain();
      Object.assign(source, { buffer, loop: true, loopStart: track.loopStart, loopEnd: track.loopEnd });
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(track.trim ?? 1, this.ctx.currentTime + SWITCH_FADE);
      source.connect(gain).connect(this.level);
      source.start();
      this.voice = { id, source, gain };
    }).catch((error) => {
      if (!this.warned) console.warn('KONK! music unavailable; the game carries on without it.', error);
      this.warned = true;
      this.decoded.delete(id);
    });
  }

  fadeOut(voice) {
    if (!voice || !this.ctx) return;
    const now = this.ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + SWITCH_FADE);
    try { voice.source.stop(now + SWITCH_FADE + 0.05); } catch { /* already stopped */ }
    voice.source.onended = () => { voice.source.disconnect(); voice.gain.disconnect(); };
  }

  load(id) {
    const cached = this.decoded.get(id);
    if (cached) { this.decoded.delete(id); this.decoded.set(id, cached); return cached; }
    const track = this.tracks[id];
    const pending = this.fetchBytes(track.url).then((bytes) => this.decode(bytes, this.ctx)).then((buffer) => {
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
      bakeLoopSeam(channels, buffer.sampleRate, track.loopStart, track.loopEnd);
      return buffer;
    });
    this.decoded.set(id, pending);
    while (this.decoded.size > KEEP_DECODED) this.decoded.delete(this.decoded.keys().next().value);
    return pending;
  }

  setDip(value, seconds) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.dip.gain.cancelScheduledValues(now);
    this.dip.gain.setTargetAtTime(value, now, seconds / 3);
  }

  /** A goal: dip under the whistle and the net, then come back up. */
  duckForGoal() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime, rest = this.wanted?.dip ? RESULTS_DIP : 1;
    this.dip.gain.cancelScheduledValues(now);
    this.dip.gain.setTargetAtTime(GOAL_DIP, now, 0.05);
    this.dip.gain.setTargetAtTime(rest, now + GOAL_DIP_SECONDS, 0.4);
  }
}
