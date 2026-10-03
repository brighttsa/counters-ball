export class PromoAudioClock {
  constructor(audio, { onStatus = () => {} } = {}) {
    Object.assign(this, { audio, onStatus });
    this.url = null;
    this.context = null;
    this.gain = null;
    this.capture = null;
    this.muted = false;
    this.duration = 0;
    this.sectionStart = 0;
    this.beatEntry = 3.4;
  }

  async load(file) {
    this.audio.pause();
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = typeof file === 'string' ? file : URL.createObjectURL(file);
    this.audio.src = this.url;
    await new Promise((resolve, reject) => {
      this.audio.onloadedmetadata = resolve;
      this.audio.onerror = () => reject(new Error('This audio file could not be opened.'));
      this.audio.load();
    });
    this.duration = this.audio.duration;
    this.onStatus(`${typeof file === 'string' ? 'NXWRTH · Afro Rave 35' : file.name} · ${this.duration.toFixed(1)}s`);
  }

  async connect() {
    if (!this.context) {
      const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContext) throw new Error('Web Audio is not available in this browser.');
      this.context = new AudioContext();
      this.source = this.context.createMediaElementSource(this.audio);
      this.gain = this.context.createGain();
      this.master = this.context.createGain();
      this.capture = this.context.createMediaStreamDestination();
      this.source.connect(this.gain).connect(this.master);
      this.master.connect(this.context.destination);
      this.master.connect(this.capture);
      this.master.gain.value = this.muted ? 0 : 1;
    }
    if (this.context.state !== 'running') await this.context.resume();
  }

  async play() {
    const ready = this.connect();
    const playback = this.audio.play();
    await Promise.all([ready, playback]);
  }

  pause() { this.audio.pause(); }
  seek(seconds) { this.audio.currentTime = Math.max(0, Math.min(this.duration || 0, seconds)); }
  get time() { return Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0; }
  get playing() { return !this.audio.paused && !this.audio.ended; }
  get audioTracks() { return this.capture?.stream.getAudioTracks() ?? []; }

  update() {
    if (!this.gain || !this.context) return;
    const time = this.time;
    const target = time < this.beatEntry ? 0 : 0.78;
    this.gain.gain.setTargetAtTime(target, this.context.currentTime, time < this.beatEntry ? 0.035 : 0.12);
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.context.currentTime, 0.035);
  }

  setMuted(muted) { this.muted = Boolean(muted); this.update(); }
  dispose() {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    if (this.url) URL.revokeObjectURL(this.url);
    this.context?.close();
  }
}
