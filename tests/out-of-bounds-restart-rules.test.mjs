import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyOutOfBounds, restartPoint } from '../src/gameplay/out-of-bounds-restart-rules.js';

const ball = (x, z) => ({ pos: { x, y: z }, radius: .035 });

test('rails remain in play until the ball genuinely escapes the table', () => {
  assert.equal(classifyOutOfBounds(ball(1.5, 1)), null);
  assert.deepEqual(classifyOutOfBounds(ball(1.7, .2)).type, 'goal-kick');
  assert.deepEqual(classifyOutOfBounds(ball(-1.7, .2)).type, 'corner');
  assert.deepEqual(classifyOutOfBounds(ball(.2, 1.2)).type, 'sideline');
});

test('restart points stay inside the playable table', () => {
  for (const type of ['goal-kick', 'corner', 'sideline']) {
    const point = restartPoint({ type, side: 'home' });
    assert.ok(Math.abs(point.x) < 1.5 && Math.abs(point.z) < 1);
  }
});
