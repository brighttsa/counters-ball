import test from 'node:test';
import assert from 'node:assert/strict';
import { createSchoolyardShotMemory, remembersSchoolyardBank, schoolyardReturnMemory } from '../src/core/schoolyard-shot-memory.js';

const level = { backdrop: 'schoolyard', mechanic: { type: 'ruler-seesaw' }, rules: { goalsToWin: 2 } };
const options = { controllers: { home: 'human', away: 'ai' } };
function fixture(l = level, o = options) {
  const writes = [];
  let saved = null;
  const storage = { getItem: () => saved, setItem: (key, value) => { saved = value; writes.push([key, value]); } };
  return { memory: createSchoolyardShotMemory(l, o, storage), storage, writes };
}
test('non-winning banks, ordinary finishes, losses and draws never save', () => {
  for (const [score, label, winner] of [[1, 'RULER BANK', 'home'], [2, '', 'home'], [2, 'RULER BANK', 'away'], [2, 'RULER BANK', null]]) {
    const { memory, writes } = fixture();
    memory.goal({ scorer: 'home', scores: { home: score } }, label);
    memory.finish({ winner }); assert.equal(writes.length, 0);
  }
});
test('AI, attract, previews, hot-seat and other venues cannot earn the memory', () => {
  for (const [l, o] of [[level, { ...options, isAttract: true }], [level, { ...options, isPreview: true }],
    [level, { controllers: { home: 'human', away: 'human' } }],
    [level, { controllers: { home: 'ai', away: 'ai' } }],
    [{ ...level, backdrop: 'kiosk' }, options], [{ ...level, mechanic: null }, options]]) {
    const { memory, writes } = fixture(l, o);
    memory.goal({ scorer: 'home', scores: { home: 2 } }, 'RULER BANK');
    memory.finish({ winner: 'home' }); assert.equal(writes.length, 0);
  }
});
test('a later ordinary goal replaces an earlier bank; away goals do not count', () => {
  const { memory, writes } = fixture();
  memory.goal({ scorer: 'home', scores: { home: 1 } }, 'RULER BANK');
  memory.goal({ scorer: 'home', scores: { home: 2 } }, '');
  memory.finish({ winner: 'home' }); assert.equal(writes.length, 0);
  const away = fixture();
  away.memory.goal({ scorer: 'away', scores: { home: 2 } }, 'RULER BANK');
  away.memory.finish({ winner: 'home' }); assert.equal(away.writes.length, 0);
});
test('winning bank saves only at match end, once; recall stays Schoolyard Legends-only', () => {
  const { memory, storage, writes } = fixture();
  memory.goal({ scorer: 'home', scores: { home: 2 } }, 'RULER BANK');
  assert.equal(writes.length, 0);
  memory.finish({ winner: 'home' }); memory.finish({ winner: 'home' });
  assert.equal(writes.length, 1); assert.equal(remembersSchoolyardBank(storage), true);
  assert.match(schoolyardReturnMemory(level, 'legends'), /match-winning ruler bank/);
  assert.equal(schoolyardReturnMemory(level, 'versus'), '');
  assert.equal(schoolyardReturnMemory({ ...level, backdrop: 'night' }, 'legends'), '');
});
test('blocked storage never interrupts a match win', () => {
  const storage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  const memory = createSchoolyardShotMemory(level, options, storage);
  memory.goal({ scorer: 'home', scores: { home: 2 } }, 'RULER BANK');
  assert.doesNotThrow(() => memory.finish({ winner: 'home' }));
  assert.equal(remembersSchoolyardBank(storage), true);
});
test('fresh module restores only the recognized saved memory', async () => {
  const fresh = await import('../src/core/schoolyard-shot-memory.js?reload-test');
  for (const value of [null, '', 'true', '{}', 'other-shot']) {
    assert.equal(fresh.remembersSchoolyardBank({ getItem: () => value }), false);
  }
  assert.equal(fresh.remembersSchoolyardBank({ getItem: () => 'ruler-bank-win' }), true);
});
