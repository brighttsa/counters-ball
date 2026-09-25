import test from 'node:test';
import assert from 'node:assert/strict';
import { AMBIENT_RECIPES, AMBIENT_CEILING_HZ } from '../src/audio/venue-ambient-sound-recipes-web-audio.js';
import { MatchMomentumLayer } from '../src/audio/match-momentum-rhythmic-tension-layer.js';

/** A recording stand-in for AudioContext: every node, frequency and connection is kept for inspection. */
function fakeContext() {
  const nodes = [];
  const param = (value = 0) => ({ value, events: [], isParam: true,
    setValueAtTime(v, t) { this.events.push(['set', v, t]); if (!this.events.length || t === 0) this.value = v; },
    linearRampToValueAtTime(v, t) { this.events.push(['ramp', v, t]); },
    exponentialRampToValueAtTime(v, t) { this.events.push(['exp', v, t]); },
    setTargetAtTime(v, t) { this.events.push(['target', v, t]); },
    cancelScheduledValues() {} });
  const node = (kind, extra = {}) => {
    const n = { kind, outputs: [], connect(target) { n.outputs.push(target); return target; }, disconnect() {},
      start() {}, stop() {}, ...extra };
    nodes.push(n);
    return n;
  };
  const ctx = {
    currentTime: 0, sampleRate: 48000, nodes,
    createOscillator: () => node('osc', { type: 'sine', frequency: param(440) }),
    createGain: () => node('gain', { gain: param(1) }),
    createBiquadFilter: () => node('filter', { type: 'lowpass', frequency: param(350), Q: param(1) }),
    createBufferSource: () => node('buffer', { buffer: null }),
    createBuffer: (channels, length) => ({ duration: length / 48000, getChannelData: () => new Float32Array(length) }),
  };
  return ctx;
}

const peakHz = (p) => Math.max(p.value, ...p.events.map((e) => e[1]));

test('no venue ambience recipe plays a tone or band above the phone-speaker ceiling', () => {
  for (let run = 0; run < 25; run++) { // recipes are randomised: sample them repeatedly
    for (const [name, recipe] of Object.entries(AMBIENT_RECIPES)) {
      const ctx = fakeContext();
      recipe(ctx, ctx.createGain(), 0.02);
      for (const n of ctx.nodes) {
        if (n.kind === 'osc') assert.ok(peakHz(n.frequency) <= AMBIENT_CEILING_HZ, `${name} oscillator at ${peakHz(n.frequency)} Hz`);
        if (n.kind === 'filter' && n.type !== 'lowpass') {
          assert.notEqual(n.type, 'highpass', `${name} must not pass everything above a cutoff`);
          assert.ok(peakHz(n.frequency) <= AMBIENT_CEILING_HZ, `${name} ${n.type} centred at ${peakHz(n.frequency)} Hz`);
        }
      }
    }
  }
});

test('the cricket pulse modulates volume only, never the audio signal itself', () => {
  const ctx = fakeContext();
  AMBIENT_RECIPES.crickets(ctx, ctx.createGain(), 0.016);
  const pulse = ctx.nodes.find((n) => n.kind === 'osc');
  assert.ok(pulse.frequency.value < 40, 'a slow pulse, not an audible tone');
  const reachesParam = (n, seen = new Set()) => n.outputs.some((o) => o.isParam || (!seen.has(o) && (seen.add(o), o.outputs && reachesParam(o, seen))));
  const depth = pulse.outputs[0];
  assert.equal(depth.kind, 'gain');
  assert.ok(depth.outputs.every((o) => o.isParam), 'the pulse feeds only a gain parameter');
  assert.ok(reachesParam(pulse));
});

test('the match-point drone is audible on phones and fades out on its own', () => {
  const ctx = fakeContext();
  const layer = new MatchMomentumLayer();
  layer.attach?.(ctx, ctx.createGain());
  layer.ctx ??= ctx;
  layer.dest ??= ctx.createGain();
  layer.startDrone();
  const osc = ctx.nodes.filter((n) => n.kind === 'osc').at(-1);
  assert.ok(osc.frequency.value >= 80, `drone at ${osc.frequency.value} Hz would rattle phone speakers`);
  const gain = osc.outputs[0].gain;
  const last = gain.events.at(-1);
  assert.deepEqual([last[0], last[1]], ['ramp', 0], 'the drone ends in silence');
  assert.ok(last[2] <= 8, `the drone lasts ${last[2]} s at most`);
});
