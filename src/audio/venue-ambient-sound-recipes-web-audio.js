// Procedural Web Audio recipes for venue ambient events: bird chirps, distant
// dogs, car passes, crickets and other environmental sounds. Each recipe takes
// an AudioContext, a destination node and a gain level, and schedules its own
// short burst of oscillators/noise. All abstract/synthetic — no samples.
// Ambience stays at or below AMBIENT_CEILING_HZ: pure tones above it pierce on phone speakers.
export const AMBIENT_CEILING_HZ = 3500;

function noiseBuffer(ctx, seconds) {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export const AMBIENT_RECIPES = {
  birdChirp(ctx, dest, gain) {
    const now = ctx.currentTime;
    const chirps = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < chirps; i++) {
      const t = now + i * (0.08 + Math.random() * 0.06);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const freq = 2200 + Math.random() * 700;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * (1.05 + Math.random() * 0.1), t + 0.04);
      osc.frequency.linearRampToValueAtTime(freq * 0.9, t + 0.07);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.008);
      g.gain.linearRampToValueAtTime(0, t + 0.06 + Math.random() * 0.03);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  },

  distantDog(ctx, dest, gain) {
    const now = ctx.currentTime;
    const barks = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < barks; i++) {
      const t = now + i * 0.35;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.linearRampToValueAtTime(220, t + 0.15);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain * 0.7, t + 0.02);
      g.gain.setValueAtTime(gain * 0.7, t + 0.08);
      g.gain.linearRampToValueAtTime(0, t + 0.18);
      osc.connect(filter).connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + 0.25);
    }
  },

  distantHorn(ctx, dest, gain) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    const base = 180 + Math.random() * 60;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.linearRampToValueAtTime(base * 1.08, now + 0.3);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.06);
    g.gain.setValueAtTime(gain, now + 0.25);
    g.gain.linearRampToValueAtTime(0, now + 0.45);
    osc.connect(filter).connect(g).connect(dest);
    osc.start(now);
    osc.stop(now + 0.5);
  },

  carPass(ctx, dest, gain) {
    const now = ctx.currentTime;
    const dur = 1.5 + Math.random() * 1;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.linearRampToValueAtTime(500, now + dur * 0.4);
    filter.frequency.linearRampToValueAtTime(180, now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + dur * 0.35);
    g.gain.linearRampToValueAtTime(0, now + dur);
    src.connect(filter).connect(g).connect(dest);
    src.start(now);
    src.stop(now + dur);
  },

  distantBounce(ctx, dest, gain) {
    const now = ctx.currentTime;
    const bounces = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < bounces; i++) {
      const gap = 0.22 * Math.pow(0.72, i);
      const t = now + (i === 0 ? 0 : gap * i);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(320 + i * 40, t);
      osc.frequency.linearRampToValueAtTime(180, t + 0.06);
      g.gain.setValueAtTime(gain * (1 - i * 0.25), t);
      g.gain.linearRampToValueAtTime(0, t + 0.05 - i * 0.01);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + 0.08);
    }
  },

  metalClatter(ctx, dest, gain) {
    const now = ctx.currentTime;
    const hits = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < hits; i++) {
      const t = now + i * (0.04 + Math.random() * 0.06);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const freq = 1200 + Math.random() * 2000;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain * (0.6 + Math.random() * 0.4), t);
      g.gain.linearRampToValueAtTime(0, t + 0.02 + Math.random() * 0.03);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + 0.06);
    }
  },

  dryRustle(ctx, dest, gain) {
    const now = ctx.currentTime;
    const dur = 0.15 + Math.random() * 0.2;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; // a band, not a highpass: dust rustles without hissing above the ceiling
    filter.frequency.value = 1800 + Math.random() * 800;
    filter.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.02);
    g.gain.linearRampToValueAtTime(0, now + dur);
    src.connect(filter).connect(g).connect(dest);
    src.start(now);
    src.stop(now + dur);
  },

  // A cricket: a soft band of noise pulsed ~30 times a second. The pulse drives the *gain*; wiring it into
  // the signal instead produced an audible low buzz under a piercing sine.
  crickets(ctx, dest, gain) {
    const now = ctx.currentTime;
    const dur = 0.6 + Math.random() * 0.5;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, dur + 0.1);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2900 + Math.random() * 400;
    band.Q.value = 8;
    const pulse = ctx.createOscillator();
    const depth = ctx.createGain();
    const am = ctx.createGain();
    const env = ctx.createGain();
    pulse.frequency.value = 26 + Math.random() * 8;
    depth.gain.value = 0.5;
    am.gain.value = 0.5; // 0.5 ± 0.5: silent to full on every pulse
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.08);
    env.gain.setValueAtTime(gain, now + dur - 0.12);
    env.gain.linearRampToValueAtTime(0, now + dur);
    pulse.connect(depth).connect(am.gain);
    src.connect(band).connect(am).connect(env).connect(dest);
    src.start(now);
    pulse.start(now);
    src.stop(now + dur + 0.05);
    pulse.stop(now + dur + 0.05);
  },

  // A soft insect tick at night: filtered noise, not a pure high sine.
  nightInsect(ctx, dest, gain) {
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.12);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2400 + Math.random() * 600;
    band.Q.value = 5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.01);
    g.gain.linearRampToValueAtTime(0, now + 0.06 + Math.random() * 0.04);
    src.connect(band).connect(g).connect(dest);
    src.start(now);
    src.stop(now + 0.12);
  },

  windGust(ctx, dest, gain) {
    const now = ctx.currentTime;
    const dur = 0.6 + Math.random() * 0.8;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(900, now + dur * 0.4);
    filter.frequency.linearRampToValueAtTime(350, now + dur);
    filter.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + dur * 0.3);
    g.gain.linearRampToValueAtTime(0, now + dur);
    src.connect(filter).connect(g).connect(dest);
    src.start(now);
    src.stop(now + dur);
  },
};
