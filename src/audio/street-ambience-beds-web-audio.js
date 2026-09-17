// Looping background beds for each venue: a soft daytime street hum, gusting
// harmattan wind, or night crickets pulsing under the kiosk bulb.
export class StreetAmbienceBeds {
  constructor() {
    this.kind = null;
    this.nodes = [];
  }

  /** Called once the audio context exists; restarts whatever was requested earlier. */
  attach(ctx, master, noiseBuffer) {
    Object.assign(this, { ctx, master, noiseBuffer });
    this.start(this.kind);
  }

  /** @param kind 'day' | 'harmattan' | 'night' | null */
  set(kind) {
    if (kind === this.kind && this.nodes.length) return;
    this.kind = kind;
    this.start(kind);
  }

  stop() {
    this.nodes.forEach((node) => { try { node.stop(); } catch { /* already stopped */ } });
    this.nodes = [];
  }

  start(kind) {
    this.stop();
    if (!this.ctx || !kind) return;
    const { ctx, master } = this;

    const bed = ctx.createBufferSource();
    bed.buffer = this.noiseBuffer;
    bed.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = kind === 'harmattan' ? 650 : 380;
    const level = ctx.createGain();
    level.gain.value = kind === 'harmattan' ? 0.07 : 0.035;
    bed.connect(filter).connect(level).connect(master);
    bed.start();
    this.nodes = [bed];

    const addLfo = (freq, depthValue, target, type = 'sine') => {
      const osc = ctx.createOscillator();
      const depth = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      depth.gain.value = depthValue;
      osc.connect(depth).connect(target);
      osc.start();
      this.nodes.push(osc);
    };

    if (kind === 'harmattan') addLfo(0.13, 260, filter.frequency); // gusting dry wind
    if (kind === 'night') {
      const cricket = ctx.createOscillator();
      const gate = ctx.createGain();
      cricket.frequency.value = 4300;
      gate.gain.value = 0;
      cricket.connect(gate).connect(master);
      cricket.start();
      this.nodes.push(cricket);
      addLfo(22, 0.01, gate.gain, 'square');  // chirp rate
      addLfo(0.7, 0.01, gate.gain, 'square'); // bursts between silences
    }
  }
}
