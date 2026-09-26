import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { KidsCrowdReactions } from '../src/audio/kids-crowd-reaction-clips.js';

function board(available = true) {
  const started = [];
  const node = () => ({ connect(t) { return t; }, disconnect() {}, gain: { value: 1 } });
  const ctx = {
    decodeAudioData: async (bytes) => ({ bytes }),
    createGain: node,
    createBufferSource: () => ({ ...node(), start() { started.push(this.buffer); } }),
  };
  return { ctx, master: node(), available: () => available, started };
}

test('every kids clip ships and stays small', () => {
  for (const name of ['kids-cheer-yay', 'kids-cheer-excited', 'kids-aww-near-miss', 'kids-win-cheer']) {
    const file = new URL(`../assets/audio/${name}.mp3`, import.meta.url);
    assert.ok(existsSync(file), name);
    assert.ok(statSync(file).size < 60_000, `${name} is small`);
  }
});

test('clips load once, play through the effects bus and never stack', async () => {
  const b = board();
  const kids = new KidsCrowdReactions(async (url) => url);
  await kids.load(b.ctx);
  assert.equal(kids.buffers.cheer.length, 2);
  assert.equal(kids.play(b, 'cheer', 1000), true);
  assert.equal(kids.play(b, 'aww', 1200), false, 'too soon after the cheer');
  assert.equal(kids.play(b, 'aww', 2500), true);
  assert.equal(b.started.at(-1).bytes, 'assets/audio/kids-aww-near-miss.mp3');
});

test('muted, paused or effects-off boards stay silent, and a failed download just leaves the kids quiet', async () => {
  const quiet = board(false);
  const kids = new KidsCrowdReactions(async (url) => url);
  await kids.load(quiet.ctx);
  assert.equal(kids.play(quiet, 'win', 5000), false);
  const broken = new KidsCrowdReactions(async () => { throw new Error('offline'); });
  await broken.load(quiet.ctx);
  assert.equal(broken.play(board(), 'cheer', 5000), false);
});
