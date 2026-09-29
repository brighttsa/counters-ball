import test from 'node:test';
import assert from 'node:assert/strict';
import { forceTier, surfaceSlideKey, APPROVED_FOLEY_SAMPLES } from '../src/audio/approved-foley-sample-manifest.js';
import { ApprovedFoleyBank } from '../src/audio/approved-foley-decoded-buffer-bank.js';

test('approved Foley maps physical strength to stable force bands', () => {
  assert.equal(forceTier(0), 'light');
  assert.equal(forceTier(0.3), 'medium');
  assert.equal(forceTier(0.679), 'medium');
  assert.equal(forceTier(0.68), 'hard');
  assert.equal(forceTier(1), 'hard');
});

test('surface slide identity follows the implemented table materials', () => {
  assert.equal(surfaceSlideKey('cardboard', false), 'slide-cardboard-clean');
  assert.equal(surfaceSlideKey('cardboard', true), 'slide-cardboard-dusty');
  assert.equal(surfaceSlideKey('wood', false), 'slide-wood-worn');
});

test('the malformed light cap collision stays absent so procedural Foley handles it', () => {
  assert.equal(APPROVED_FOLEY_SAMPLES['cap-cap-light'], undefined);
  assert.equal(Object.keys(APPROVED_FOLEY_SAMPLES).length, 13);
});

test('sampled Foley follows the shared effects level used by attract mode', () => {
  const bank = new ApprovedFoleyBank();
  bank.setLevel(0.35);
  assert.equal(bank.level, 0.35);
  bank.setLevel(4);
  assert.equal(bank.level, 1);
});
