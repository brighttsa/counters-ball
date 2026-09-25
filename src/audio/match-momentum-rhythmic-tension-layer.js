// A subtle rhythmic layer that builds as match momentum (heat) rises and
// intensifies further at match point (tension). Creates the feeling of a crowd
// leaning in — spectators tapping the table edge, a low hum of anticipation.
// All procedural Web Audio, no samples. Sits well below the contacts and music.

const PULSE_INTERVAL_HIGH = 0.42;  // seconds between taps at max heat
const PULSE_INTERVAL_LOW = 0.9;    // seconds between taps at low heat
const PULSE_BASE_GAIN = 0.012;
const PULSE_HEAT_GAIN = 0.025;
const TENSION_DRONE_FREQ = 55;
const TENSION_DRONE_GAIN = 0.04;
const TENSION_FADE = 1.2;

export class MatchMomentumLayer {
  constructor() {
    this.ctx = null;
    this.dest = null;
    this.heat = 0;
    this.tension = false;
    this.active = false;
    this.pulseTimer = null;
    this.droneNodes = null;
  }

  attach(ctx, dest) {
    this.ctx = ctx;
    this.dest = dest;
  }

  start() {
    if (this.active || !this.ctx) return;
    this.active = true;
    this.schedulePulse();
  }

  stop() {
    this.active = false;
    clearTimeout(this.pulseTimer);
    this.pulseTimer = null;
    this.stopDrone();
  }

  setHeat(value) {
    this.heat = Math.max(0, Math.min(1, value));
    if (this.active && this.heat > 0.15 && !this.pulseTimer) this.schedulePulse();
  }

  setTension(on) {
    const was = this.tension;
    this.tension = Boolean(on);
    if (!this.ctx || !this.dest) return;
    if (this.tension && !was) this.startDrone();
    else if (!this.tension && was) this.stopDrone();
  }

  schedulePulse() {
    if (!this.active || !this.ctx) return;
    if (this.heat < 0.1) {
      this.pulseTimer = setTimeout(() => this.schedulePulse(), 800);
      return;
    }
    this.firePulse();
    const interval = PULSE_INTERVAL_LOW - (PULSE_INTERVAL_LOW - PULSE_INTERVAL_HIGH) * this.heat;
    const jitter = interval * 0.15 * (Math.random() * 2 - 1);
    this.pulseTimer = setTimeout(() => this.schedulePulse(), (interval + jitter) * 1000);
  }

  firePulse() {
    if (!this.ctx || !this.dest) return;
    const now = this.ctx.currentTime;
    const gain = PULSE_BASE_GAIN + this.heat * PULSE_HEAT_GAIN;
    const freq = 130 + this.heat * 50 + Math.random() * 20;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(freq * 0.7, now + 0.06);
    g.gain.setValueAtTime(gain * (this.tension ? 1.4 : 1), now);
    g.gain.linearRampToValueAtTime(0, now + 0.06);
    osc.connect(g).connect(this.dest);
    osc.start(now);
    osc.stop(now + 0.08);
    // A quiet knock click on top for attack definition.
    const nBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.02, this.ctx.sampleRate);
    const data = nBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const nSrc = this.ctx.createBufferSource();
    nSrc.buffer = nBuf;
    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.value = 600 + this.heat * 400;
    nFilter.Q.value = 2;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(gain * 0.4, now);
    nGain.gain.linearRampToValueAtTime(0, now + 0.018);
    nSrc.connect(nFilter).connect(nGain).connect(this.dest);
    nSrc.start(now);
    nSrc.stop(now + 0.025);
  }

  startDrone() {
    if (!this.ctx || !this.dest || this.droneNodes) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = TENSION_DRONE_FREQ;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(TENSION_DRONE_GAIN, now + TENSION_FADE);
    osc.connect(g).connect(this.dest);
    osc.start(now);
    this.droneNodes = { osc, gain: g };
  }

  stopDrone() {
    if (!this.droneNodes || !this.ctx) { this.droneNodes = null; return; }
    const now = this.ctx.currentTime;
    const { osc, gain } = this.droneNodes;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + TENSION_FADE * 0.6);
    try { osc.stop(now + TENSION_FADE); } catch { /* already stopped */ }
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    this.droneNodes = null;
  }

  dispose() {
    this.stop();
    this.ctx = null;
    this.dest = null;
  }
}
