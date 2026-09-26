import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyFlickPuzzle, dailyNumber, DAILY_FLICK_LIMIT } from '../src/levels/daily-flick-puzzle.js';
import { recordDailyResult, dailyShareText } from '../src/core/daily-flick-record.js';
import { GOAL_LINE_X, PITCH_HALF_WIDTH } from '../src/core/pitch-dimensions-and-constants.js';

test('puzzle numbers count days from launch, and each day gives everyone the same table', () => {
  assert.equal(dailyNumber(Date.UTC(2026, 8, 26, 12)), 1);
  assert.equal(dailyNumber(Date.UTC(2026, 8, 27, 0, 1)), 2);
  assert.deepEqual(dailyFlickPuzzle(7), dailyFlickPuzzle(7));
  assert.notDeepEqual(dailyFlickPuzzle(7).setup, dailyFlickPuzzle(8).setup);
});

test('every puzzle keeps the pieces on the pitch, blocks the straight line, and uses solo rules', () => {
  for (let n = 1; n <= 200; n++) {
    const { level, setup, par } = dailyFlickPuzzle(n);
    const pieces = [setup.ball, ...setup.home, ...setup.away];
    for (const [x, z] of pieces) {
      assert.ok(Math.abs(x) < GOAL_LINE_X && Math.abs(z) < PITCH_HALF_WIDTH, `#${n} piece off the pitch`);
    }
    const [defender] = [setup.away[1]];
    assert.ok(defender[0] > setup.ball[0], `#${n} defender stands goal-side of the ball`);
    assert.equal(level.rules.awayFlickLimit, 0);
    assert.equal(level.rules.flickLimit, DAILY_FLICK_LIMIT);
    assert.ok(par === 1 || par === 2);
    assert.equal(level.obstacles.length, 0);
  }
});

test('the record keeps the best score and counts consecutive days only', () => {
  const progress = {};
  assert.deepEqual(recordDailyResult(progress, 3, 3), { best: 3, streak: 1, improved: true });
  assert.deepEqual(recordDailyResult(progress, 3, 4), { best: 3, streak: 1, improved: false });
  assert.deepEqual(recordDailyResult(progress, 4, null), { best: null, streak: 2, improved: false });
  assert.deepEqual(recordDailyResult(progress, 6, 2), { best: 2, streak: 1, improved: true }, 'a skipped day resets the streak');
});

test('share text shows one ball per flick, par and the streak', () => {
  assert.equal(dailyShareText(12, 2, 2, 3, 'https://konk.world'),
    'KONK! Daily Flick #12\n⚽⚽ 2 flicks (par 2) · 3-day streak\nhttps://konk.world');
  assert.match(dailyShareText(12, null, 2, 1, 'u'), /no goal/);
});
