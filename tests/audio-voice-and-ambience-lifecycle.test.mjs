import test from 'node:test';
import assert from 'node:assert/strict';
import { ProceduralSoundBoard } from '../src/audio/procedural-sound-effects-web-audio.js';
import { StreetAmbienceBeds, AMBIENCE_PROFILES } from '../src/audio/street-ambience-beds-web-audio.js';

// Web Audio boundary doubles record scheduling and resource ownership, not sound quality.
function audioContext() {
  const nodes = [];
  const parameter = () => ({ value: 0, targets: [], setValueAtTime() {},
    exponentialRampToValueAtTime() {}, setTargetAtTime(value) { this.targets.push(value); } });
  const node = () => {
    const result = { gain: parameter(), frequency: parameter(), Q: parameter(),
      disconnects: 0, stops: 0, starts: 0,
      connect(target) { return target; }, disconnect() { this.disconnects++; },
      start() { this.starts++; }, stop() { this.stops++; },
    };
    nodes.push(result);
    return result;
  };
  return { nodes, currentTime: 1, createGain: node, createOscillator: node,
    createBufferSource: node, createBiquadFilter: node,
    suspends: 0, resumes: 0, closes: 0,
    suspend() { this.suspends++; return Promise.resolve(); },
    resume() { this.resumes++; return Promise.resolve(); },
    close() { this.closes++; return Promise.resolve(); },
  };
}

function board() {
  const sound = new ProceduralSoundBoard();
  const ctx = audioContext();
  Object.assign(sound, { ctx, master: ctx.createGain(), compressor: ctx.createGain(), noiseBuffer: {} });
  sound.ambience.attach(ctx, sound.master, sound.noiseBuffer);
  return { sound, ctx };
}

test('voice cap rejects extra allocation and ending a voice frees its full chain', () => {
  const { sound, ctx } = board();
  for (let i = 0; i < 32; i++) sound.tone({ freq: 440 });
  assert.equal(sound.voices.size, 32);
  const allocated = ctx.nodes.length;
  assert.equal(sound.tone({ freq: 440 }), null);
  sound.noise({});
  assert.equal(ctx.nodes.length, allocated);
  const voice = [...sound.voices][0];
  voice.source.onended();
  assert.equal(sound.voices.size, 31);
  assert.ok(voice.nodes.every(node => node.disconnects === 1));
  sound.noise({});
  assert.equal(sound.voices.size, 32);
  const noise = [...sound.voices].at(-1);
  assert.equal(noise.nodes.length, 3);
  noise.source.onended();
  assert.ok(noise.nodes.every(node => node.disconnects === 1));
});

test('pause and mute suppress new voices and resume restores availability', () => {
  const { sound, ctx } = board();
  sound.setPaused(true);
  assert.equal(ctx.suspends, 1);
  assert.equal(sound.tone({ freq: 440 }), null);
  sound.setPaused(false);
  assert.equal(ctx.resumes, 1);
  sound.setMuted(true);
  assert.equal(sound.tone({ freq: 440 }), null);
  sound.setMuted(false);
  assert.ok(sound.tone({ freq: 440 }));
});

test('dispose stops voices and ambience, disconnects nodes and releases context once', () => {
  const { sound, ctx } = board();
  sound.setAmbience('kiosk');
  sound.tone({ freq: 440 });
  sound.noise({});
  const voices = [...sound.voices];
  const ambienceSources = [...sound.ambience.sources];
  sound.dispose();
  assert.equal(sound.voices.size, 0);
  assert.equal(sound.ctx, null);
  assert.equal(sound.ambience.ctx, null);
  assert.equal(sound.noiseBuffer, null);
  assert.ok(voices.every(voice => voice.source.onended === null));
  assert.ok(ctx.nodes.every(node => node.disconnects === 1));
  assert.ok(ambienceSources.every(source => source.stops === 1));
  sound.dispose();
  assert.equal(ctx.closes, 1);
});

test('ambience tension ducks heat-adjusted level and survives venue changes', () => {
  const ambience = new StreetAmbienceBeds();
  const ctx = audioContext();
  ambience.set('kiosk');
  ambience.setHeat(1);
  ambience.setTension(true);
  ambience.attach(ctx, ctx.createGain(), {});
  const expected = AMBIENCE_PROFILES.kiosk.level * 1.35 * 0.6;
  assert.ok(Math.abs(ambience.level.gain.value - expected) < 1e-12);
  const oldNodes = [...ambience.nodes], oldSources = [...ambience.sources];
  ambience.set('kiosk');
  assert.deepEqual(ambience.nodes, oldNodes);
  ambience.set('night');
  assert.ok(oldNodes.every(node => node.disconnects === 1));
  assert.ok(oldSources.every(source => source.stops === 1));
  assert.ok(Math.abs(ambience.level.gain.value - AMBIENCE_PROFILES.night.level * 1.35 * 0.6) < 1e-12);
  ambience.setTension(false);
  assert.ok(Math.abs(ambience.level.gain.targets.at(-1) - AMBIENCE_PROFILES.night.level * 1.35) < 1e-12);
  ambience.setHeat(NaN);
  assert.equal(ambience.level.gain.targets.at(-1), AMBIENCE_PROFILES.night.level);
  ambience.stop();
  assert.deepEqual(ambience.nodes, []);
  assert.deepEqual(ambience.sources, []);
});
