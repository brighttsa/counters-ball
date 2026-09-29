import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchMomentAudioDirector } from '../src/audio/match-moment-audio-director.js';

test('a goal leaves physical space before reaction and reward', () => {
  const calls = [], scheduled = [];
  const director = new MatchMomentAudioDirector({
    schedule: (delay, callback) => scheduled.push([delay, callback]),
    net: pan => calls.push(['net', pan]), whistle: () => calls.push(['whistle']),
    reaction: (...args) => calls.push(['reaction', ...args]), reward: (...args) => calls.push(['reward', ...args]),
    duck: (...args) => calls.push(['duck', ...args]),
  });
  director.goal({ pan: 0.4, significance: 0.8, positive: true });
  assert.deepEqual(calls, [['duck', 0.42, 1.8], ['net', 0.4]]);
  assert.equal(scheduled[0][0], 0.09);
  scheduled[0][1]();
  assert.deepEqual(calls.slice(2), [['whistle'], ['reaction', 'cheer', 0.8, 0.4], ['reward', 0.8, 0.4]]);
});

test('a near miss stays restrained and never plays a goal reward', () => {
  const calls = [];
  const director = new MatchMomentAudioDirector({
    schedule: (delay, callback) => { calls.push(['wait', delay]); callback(); },
    reaction: (...args) => calls.push(['reaction', ...args]), duck: (...args) => calls.push(['duck', ...args]),
  });
  director.nearMiss({ pan: -0.2, significance: 0.3 });
  assert.deepEqual(calls, [['duck', 0.72, 0.6], ['wait', 0.045], ['reaction', 'near-miss', 0.3, -0.2]]);
});
