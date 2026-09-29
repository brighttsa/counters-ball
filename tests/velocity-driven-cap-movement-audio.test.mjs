import test from 'node:test';
import assert from 'node:assert/strict';
import { VelocityDrivenCapMovementAudio } from '../src/audio/velocity-driven-cap-movement-audio.js';

const body = (speed) => ({ kind: 'cap', invMass: 1, vel: { x: speed, y: 0 } });

test('moving caps emit spaced grains and one settle tick', () => {
  const slides = [], settles = [];
  const movement = new VelocityDrivenCapMovementAudio({
    onSlide: (...args) => slides.push(args), onSettle: (...args) => settles.push(args),
  });
  const cap = body(3);
  movement.update([cap], 1 / 60, () => 0.4);
  movement.update([cap], 1 / 60, () => 0.4);
  assert.equal(slides.length, 1);
  assert.equal(slides[0][1], 0.4);
  cap.vel.x = 0;
  movement.update([cap], 1 / 60);
  movement.update([cap], 1 / 60);
  assert.equal(settles.length, 1);
});

test('slow, static, and non-cap bodies remain silent', () => {
  let events = 0;
  const movement = new VelocityDrivenCapMovementAudio({ onSlide: () => events++, onSettle: () => events++ });
  movement.update([body(0.3), { ...body(3), invMass: 0 }, { ...body(3), kind: 'ball' }], 0.5);
  assert.equal(events, 0);
});
