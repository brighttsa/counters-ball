import test from 'node:test';
import assert from 'node:assert/strict';
import { CompactTransformReplay } from '../src/gameplay/compact-transform-replay.js';

// These doubles implement only Three's transform serialization interface.
function field(values) {
  return {
    values: [...values],
    toArray(target, offset) { target.set(this.values, offset); return target; },
    fromArray(source, offset) {
      this.values = Array.from(source.slice(offset, offset + this.values.length));
      return this;
    },
  };
}

const object = () => ({
  position: field([0, 0, 0]), quaternion: field([0, 0, 0, 1]), scale: field([1, 1, 1]),
});
const values = objects => objects.map(o => [o.position.values, o.quaternion.values, o.scale.values]);

function record(replay, objects, count) {
  for (let frame = 0; frame < count; frame++) {
    objects.forEach((o, i) => { o.position.values = [frame, i, -frame]; });
    replay.capture(replay.step);
  }
}

test('short history refuses playback without changing live transforms', () => {
  const objects = [object()];
  const replay = new CompactTransformReplay(objects);
  record(replay, objects, 5);
  const before = structuredClone(values(objects));
  assert.equal(replay.start(), false);
  replay.update(10);
  assert.deepEqual(values(objects), before);
});

test('ring buffer wraps chronologically and remains fixed capacity', () => {
  const objects = [object(), object()];
  const replay = new CompactTransformReplay(objects, 1, 10);
  const allocated = replay.data;
  record(replay, objects, 15);
  assert.equal(replay.count, 10);
  assert.equal(replay.data, allocated);
  assert.equal(replay.data.length, 10 * 2 * 10);
  assert.equal(replay.start(), true);
  replay.update(0);
  assert.deepEqual(objects[0].position.values, [5, 0, -5]);
  replay.update(replay.playbackDuration / 2);
  assert.deepEqual(objects[0].position.values, [9, 0, -9]);
  assert.deepEqual(objects[1].position.values, [9, 1, -9]);
});

function timedHistory(intervals, seconds) {
  const mesh = object();
  const replay = new CompactTransformReplay([mesh]);
  replay.capture(0);
  let time = 0, index = 0;
  while (time < seconds - 1e-9) {
    const dt = Math.min(intervals[index++ % intervals.length], seconds - time);
    time += dt;
    mesh.position.values[0] = time;
    replay.capture(dt);
  }
  assert.equal(replay.start(), true);
  replay.update(replay.playbackDuration / 2);
  return { replay, midpoint: mesh.position.values[0] };
}

test('20fps and 60fps preserve real history duration and midpoint', () => {
  const slow = timedHistory([1 / 20], 2.4);
  const fast = timedHistory([1 / 60], 2.4);
  assert.ok(Math.abs(slow.replay.duration - 3.12) < 1e-8);
  assert.ok(Math.abs(fast.replay.duration - 3.12) < 1e-8);
  assert.ok(Math.abs(slow.midpoint - fast.midpoint) <= 0.05);
  assert.ok(Math.abs(slow.midpoint - 1.2) <= 0.05);
});

test('variable frame times trim history to three real seconds and select timestamp midpoint', () => {
  const { replay, midpoint } = timedHistory([0.02, 0.08, 0.04, 0.06], 7);
  const oldest = replay.times[replay.oldest()];
  assert.ok(replay.historyDuration <= 3 + 1e-9);
  assert.ok(replay.historyDuration >= 2.9);
  const target = oldest + replay.historyDuration / 2;
  assert.ok(midpoint <= target + 1e-6);
  assert.ok(target - midpoint <= 0.08 + 1e-6);
  assert.ok(Math.abs(replay.duration - (replay.historyDuration / 0.8 + 0.12)) < 1e-8);
});

test('forced goal frame captures a sub-sample interval without inventing elapsed time', () => {
  const mesh = object();
  const replay = new CompactTransformReplay([mesh]);
  record(replay, [mesh], 8);
  const before = replay.time, count = replay.count;
  mesh.position.values[0] = 100;
  replay.capture(0.001, true);
  assert.equal(replay.count, count + 1);
  assert.ok(Math.abs(replay.time - before - 0.001) < 1e-12);
  const latest = (replay.head - 1 + replay.capacity) % replay.capacity;
  assert.equal(replay.times[latest], replay.time);
  assert.equal(replay.data[latest * replay.stride], 100);
});

test('last goal transform remains visible during final hold then live transform is restored', () => {
  const mesh = object();
  const replay = new CompactTransformReplay([mesh]);
  record(replay, [mesh], 8);
  mesh.position.values = [100, 2, 3];
  replay.capture(0.001, true);
  mesh.position.values = [200, 4, 6];
  assert.equal(replay.start(), true);
  assert.ok(Math.abs(replay.duration - replay.playbackDuration - 0.12) < 1e-12);
  replay.update(replay.playbackDuration);
  assert.equal(replay.active, true);
  assert.deepEqual(mesh.position.values, [100, 2, 3]);
  replay.update(0.06);
  assert.equal(replay.active, true);
  assert.deepEqual(mesh.position.values, [100, 2, 3]);
  replay.update(replay.duration - replay.elapsed + 1e-9);
  assert.equal(replay.active, false);
  assert.deepEqual(mesh.position.values, [200, 4, 6]);
});

for (const finish of ['skip', 'complete']) {
  test(`${finish} restores all live transforms and repeated stop is harmless`, () => {
    const objects = [object(), object()];
    const replay = new CompactTransformReplay(objects);
    record(replay, objects, 10);
    for (const o of objects) {
      o.position.values = [91, 92, 93];
      o.quaternion.values = [0, 1, 0, 0];
      o.scale.values = [2, 3, 4];
    }
    const live = structuredClone(values(objects));
    assert.equal(replay.start(), true);
    assert.equal(replay.start(), false);
    const count = replay.count;
    replay.capture(1);
    assert.equal(replay.count, count);
    replay.update(0);
    assert.notDeepEqual(values(objects), live);
    if (finish === 'skip') replay.stop();
    else replay.update(replay.duration);
    assert.equal(replay.active, false);
    assert.deepEqual(values(objects), live);
    replay.stop();
    replay.update(100);
    assert.deepEqual(values(objects), live);
  });
}

test('zero playback delta freezes transforms and reset clears old venue history', () => {
  const objects = [object()];
  const replay = new CompactTransformReplay(objects);
  record(replay, objects, 12);
  replay.start();
  replay.update(0.5);
  const paused = structuredClone(values(objects));
  replay.update(0);
  assert.deepEqual(values(objects), paused);
  replay.stop();
  replay.reset();
  assert.equal(replay.start(), false);
  assert.equal(replay.count, 0);
});
