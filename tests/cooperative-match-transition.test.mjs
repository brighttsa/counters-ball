import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeBuildSteps } from '../src/core/cooperative-task-yield.js';
import { createMatchTransitionController } from '../src/core/match-transition-controller.js';

test('construction starts after yielding and yields between every build step', async () => {
  const calls = [];
  function* steps() { calls.push('first'); yield; calls.push('second'); yield; return 'stage'; }
  const result = await consumeBuildSteps(steps(), { yieldTask: async () => calls.push('paint') });
  assert.equal(result, 'stage');
  assert.deepEqual(calls, ['paint', 'first', 'paint', 'second', 'paint']);
});

test('aborting staged construction closes the generator and frees incomplete resources', async () => {
  const controller = new AbortController();
  let freed = 0, built = 0, yields = 0;
  function* steps() { try { built++; yield; built++; } finally { freed++; } }
  await assert.rejects(consumeBuildSteps(steps(), { signal: controller.signal,
    yieldTask: async () => { if (++yields === 2) controller.abort(); } }), { name: 'AbortError' });
  assert.equal(built, 1); assert.equal(freed, 1);
});

test('builder errors close the iterator and propagate without inventing a stage', async () => {
  let freed = false;
  function* steps() { try { yield; throw Error('texture failure'); } finally { freed = true; } }
  await assert.rejects(consumeBuildSteps(steps(), { yieldTask: async () => {} }), /texture failure/);
  assert.equal(freed, true);
});

function fixture() {
  const calls = [], app = { session: { input: { cancel: () => calls.push('input') } } };
  const flow = createMatchTransitionController({ app, show: () => calls.push('show'), hide: () => calls.push('hide'), onError: e => calls.push(e.message) });
  return { app, calls, flow };
}

test('a superseded build cannot activate its stage or clear the newer busy state', async () => {
  const { app, calls, flow } = fixture();
  let finishFirst, finishSecond, disposed = 0;
  const first = flow.prepare(() => new Promise(resolve => { finishFirst = resolve; }));
  const second = flow.prepare(() => new Promise(resolve => { finishSecond = resolve; }));
  finishFirst({ dispose: () => disposed++ });
  assert.equal(await first, null); assert.equal(disposed, 1); assert.equal(app.building, true);
  const stage = { dispose() {} }; finishSecond(stage);
  assert.equal(await second, stage); assert.equal(app.building, false);
  assert.equal(calls.filter(c => c === 'hide').length, 1);
});

test('cancelling construction cannot resurrect a match after navigation', async () => {
  const { app, flow } = fixture();
  let finish, disposed = 0;
  const pending = flow.prepare(() => new Promise(resolve => { finish = resolve; }));
  flow.cancel(); assert.equal(app.building, false);
  finish({ dispose: () => disposed++ });
  assert.equal(await pending, null); assert.equal(disposed, 1);
});

test('failed construction restores responsiveness and reports the error once', async () => {
  const { app, calls, flow } = fixture();
  assert.equal(await flow.prepare(async () => { throw Error('missing canvas'); }), null);
  assert.equal(app.building, false);
  assert.equal(calls.filter(c => c === 'missing canvas').length, 1);
});
