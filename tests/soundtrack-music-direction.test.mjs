import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { SOUNDTRACK, musicForScreen, matchTrackFor } from '../src/audio/soundtrack-track-list-and-screen-routing.js';
import { bakeLoopSeam } from '../src/audio/soundtrack-loop-seam.js';
import { SoundtrackDirector } from '../src/audio/soundtrack-music-director.js';
import { MUSIC_LEVELS } from '../src/audio/music-and-effects-audio-settings.js';

test('Afro Rave 35 carries across menus and every match mode without restarting', () => {
  assert.equal(musicForScreen('title', 'campaign').id, 'home');
  assert.equal(musicForScreen('levels', 'legends').id, 'home');
  assert.equal(musicForScreen('challenge', 'campaign').id, 'home');
  assert.equal(musicForScreen('intro', 'campaign', 'home').id, 'home', 'the rules card from the menus keeps the menu music');
  for (const mode of ['campaign', 'legends', 'versus', 'practice']) {
    assert.equal(matchTrackFor(mode), 'home');
    assert.equal(musicForScreen(null, mode).id, 'home');
    assert.deepEqual(musicForScreen('pause', mode), { id: 'home', dip: false });
    assert.deepEqual(musicForScreen('results', mode), { id: 'home', dip: true });
    assert.equal(musicForScreen('intro', mode, 'home').id, 'home');
  }
});

test('the loop join is continuous: just before loopEnd the audio has become what leads into loopStart', () => {
  const rate = 1000, data = Float32Array.from({ length: 10000 }, (_, i) => Math.sin(i * 0.37) + (i % 7) * 0.01);
  const original = data.slice();
  assert.ok(bakeLoopSeam([data], rate, 2, 8, 0.15));
  const start = 2000, end = 8000, length = 150;
  assert.ok(Math.abs(data[end - 1] - original[start - 1]) < 0.02, 'wraps from loopEnd straight into loopStart');
  assert.ok(Math.abs(data[end - length] - original[end - length]) < 0.02, 'the blend starts from the audio that was there');
  assert.deepEqual(Array.from(data.slice(0, end - length)), Array.from(original.slice(0, end - length)), 'nothing else changes');
});

test('the sole soundtrack is in the project and its loop sits inside the recording', () => {
  assert.deepEqual(Object.keys(SOUNDTRACK), ['home']);
  for (const [id, track] of Object.entries(SOUNDTRACK)) {
    assert.ok(existsSync(new URL(`../${track.url}`, import.meta.url)), `${id}: ${track.url}`);
    assert.ok(statSync(new URL(`../${track.url}`, import.meta.url)).size > 1e6, `${id} is the real recording`);
    assert.ok(track.loopStart > 5 && track.loopEnd - track.loopStart > 30, `${id} loops a substantial section after its intro`);
  }
});

test('NXWRTH main theme loops 32 bars after the producer tag and before its outro', () => {
  assert.match(SOUNDTRACK.home.title, /NXWRTH/);
  assert.equal(SOUNDTRACK.home.url, 'assets/audio/afro-rave35-155bpm-konk-world.mp3');
  assert.ok(SOUNDTRACK.home.loopStart > 12);
  assert.ok(Math.abs(SOUNDTRACK.home.loopEnd - SOUNDTRACK.home.loopStart - 32 * 4 * 60 / 155) < 0.001);
  assert.ok(SOUNDTRACK.home.loopEnd < 74.338707);
});

// A stand-in AudioContext that records what the director asks of it.
function fakeContext() {
  const param = (value) => ({ value, calls: [], cancelScheduledValues() {},
    setValueAtTime(v) { this.value = v; this.calls.push(v); }, linearRampToValueAtTime(v) { this.value = v; this.calls.push(v); },
    setTargetAtTime(v) { this.value = v; this.calls.push(v); } });
  const ctx = { currentTime: 0, destination: {}, sources: [],
    createGain: () => ({ gain: param(1), connect: (n) => n, disconnect() {} }),
    createBufferSource: () => { const s = { connect: (n) => n, disconnect() {}, start() { s.started = true; }, stop() { s.stopped = true; } }; ctx.sources.push(s); return s; },
  };
  return ctx;
}
const flush = () => new Promise((r) => setTimeout(r, 0));
function director() {
  const fetched = [];
  const d = new SoundtrackDirector({
    fetchBytes: async (url) => { fetched.push(url); return new ArrayBuffer(8); },
    decode: async () => ({ numberOfChannels: 1, sampleRate: 100, getChannelData: () => new Float32Array(20000) }),
  });
  return { d, fetched };
}

test('music waits for the first tap, then plays what the current screen asked for', async () => {
  const { d } = director();
  d.request('home');
  const ctx = fakeContext();
  d.attach(ctx);
  await flush();
  assert.equal(ctx.sources.length, 1);
  assert.equal(d.playing, 'home');
  assert.ok(ctx.sources[0].loop && ctx.sources[0].loopStart === SOUNDTRACK.home.loopStart);
});

test('asking again for the playing track never restarts it, and rapid hops end on one track only', async () => {
  const { d, fetched } = director();
  const ctx = fakeContext();
  d.attach(ctx);
  d.request('home'); await flush();
  d.request('home'); d.request('home', { dip: true }); await flush();
  assert.equal(ctx.sources.length, 1, 'turns, goals and the results card keep the same playback');
  d.request('home'); d.request('home'); d.request('home'); await flush();
  assert.equal(ctx.sources.filter((s) => s.started && !s.stopped).length, 1, 'never two tracks at once');
  assert.equal(d.playing, 'home');
  assert.ok(!ctx.sources[0].stopped, 'the track continues through mode changes');
  assert.equal(fetched.filter((u) => u === SOUNDTRACK.home.url).length, 1, 'a track is fetched once');
});

test('volume and mute set the music bus; a goal dips it and brings it back', async () => {
  const { d } = director();
  const ctx = fakeContext();
  d.attach(ctx);
  d.setVolume(1);
  const full = d.level.gain.value;
  d.setVolume(0.35);
  assert.ok(Math.abs(d.level.gain.value - full * 0.35) < 1e-9);
  d.setMuted(true);
  assert.equal(d.level.gain.value, 0);
  d.duckForGoal();
  assert.deepEqual(d.dip.gain.calls.slice(-2), [0.5, 1]);
});

test('music has four levels, Off to High, and bad saves fall back to Medium', async () => {
  assert.deepEqual(MUSIC_LEVELS.map((l) => l.label), ['Off', 'Low', 'Medium', 'High']);
  const { loadProgress } = await import('../src/core/save-progress-local-storage.js');
  const saved = (data) => { globalThis.window = { localStorage: { getItem: () => JSON.stringify(data) } }; return loadProgress(); };
  try {
    assert.equal(saved({ stars: {}, musicVolume: 0.35, effectsOff: true }).musicVolume, 0.35);
    assert.equal(saved({ stars: {}, musicVolume: 0.35, effectsOff: true }).effectsOff, true);
    assert.equal(saved({ stars: {}, musicVolume: 7 }).musicVolume, undefined);
  } finally { delete globalThis.window; }
});
