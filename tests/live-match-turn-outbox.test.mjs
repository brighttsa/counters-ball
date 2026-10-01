import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveMatchTurnOutbox } from '../src/core/live-match-turn-outbox.js';

test('retries the same turn after connection failure and acknowledges once', async () => {
  const letter = { seq: 1 };
  const attempts = []; const sent = []; let retries = 0;
  let resolve;
  const done = new Promise(r => { resolve = r; });
  const box = createLiveMatchTurnOutbox({ delay: 1,
    async send(value) { attempts.push(value); if (attempts.length === 1) throw Error('offline'); },
    onRetry() { retries++; }, onError: assert.fail,
    onSent(value) { sent.push(value); resolve(); },
  });
  await box.send(letter); await done; box.close();
  assert.deepEqual(attempts, [letter, letter]); assert.deepEqual(sent, [letter]); assert.equal(retries, 1);
});

test('closing stops pending retries', async () => {
  let attempts = 0;
  const box = createLiveMatchTurnOutbox({ delay: 1, async send() { attempts++; throw Error('offline'); },
    onRetry() {}, onSent: assert.fail, onError: assert.fail });
  await box.send({}); box.close();
  await new Promise(r => setTimeout(r, 20)); assert.equal(attempts, 1);
});

test('permanent seat errors do not retry', async () => {
  const failure = Object.assign(Error('seat'), { status: 403 }); let reported;
  const box = createLiveMatchTurnOutbox({ async send() { throw failure; }, onRetry: assert.fail,
    onSent: assert.fail, onError(error) { reported = error; } });
  await box.send({}); box.close(); assert.equal(reported, failure);
});
