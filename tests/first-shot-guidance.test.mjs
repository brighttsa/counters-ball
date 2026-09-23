import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers/real-three-session-fixture.mjs';

test('first-shot guidance persists completion without touching other save keys', async () => {
  const values = new Map([['progress', 'untouched']]);
  globalThis.localStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const guidance = await import('../src/core/first-shot-guidance.js?persist');
  assert.equal(guidance.needsFirstShotGuidance(), true);
  guidance.completeFirstShotGuidance();
  assert.equal(guidance.needsFirstShotGuidance(), false);
  const nextVisit = await import('../src/core/first-shot-guidance.js?next-visit');
  assert.equal(nextVisit.needsFirstShotGuidance(), false);
  assert.equal(values.get('progress'), 'untouched');
  delete globalThis.localStorage;
});

test('blocked storage still remembers a completed shot for the visit', async () => {
  globalThis.localStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  const guidance = await import('../src/core/first-shot-guidance.js?blocked');
  assert.equal(guidance.needsFirstShotGuidance(), true);
  guidance.completeFirstShotGuidance();
  assert.equal(guidance.needsFirstShotGuidance(), false);
  delete globalThis.localStorage;
});

test('non-tutorial human turns teach until an accepted human flick, never attract mode', async () => {
  const guidance = await import('../src/core/first-shot-guidance.js');
  const { s } = fixture();
  s.tutorialDone = false;
  s.rules.start();
  assert.equal(s.tutorialActive, true);
  s.input.cancel();
  assert.equal(guidance.needsFirstShotGuidance(), true);
  assert.equal(s.rules.registerFlick('away'), false);
  assert.equal(guidance.needsFirstShotGuidance(), true);
  const { s: attract } = fixture({ isAttract: true });
  attract.tutorialDone = false;
  attract.rules.start();
  assert.equal(attract.tutorialActive, false);
  attract.rules.registerFlick('home');
  assert.equal(guidance.needsFirstShotGuidance(), true);
  s.rules.registerFlick('home');
  assert.equal(guidance.needsFirstShotGuidance(), false);
  assert.equal(s.tutorialActive, false);
});
