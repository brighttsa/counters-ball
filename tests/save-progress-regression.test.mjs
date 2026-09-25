import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProgress, saveProgress, recordLevelStars, isLevelUnlocked, totalStars }
  from '../src/core/save-progress-local-storage.js';
import { CAMPAIGN_LEVELS } from '../src/levels/campaign-level-definitions.js';

const key = 'counters-ball-3d/progress-v1';

// Replace only the browser storage boundary; exercise the real save implementation.
function storage(t, raw = null) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const values = new Map(raw === null ? [] : [[key, raw]]);
  const writes = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: {
      getItem: name => values.get(name) ?? null,
      setItem: (name, value) => { writes.push([name, value]); values.set(name, value); },
    },
  } });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else delete globalThis.window;
  });
  return { writes };
}

test('existing v1 saves round-trip all six stable venue IDs; a saved mute never outlives the visit', t => {
  const ids = ['schoolyard', 'kiosk', 'veranda', 'roadside', 'harmattan', 'nightbulb'];
  assert.deepEqual(CAMPAIGN_LEVELS.map(level => level.id), ids);
  const expected = { stars: Object.fromEntries(ids.map((id, i) => [id, i % 4])), muted: false };
  const { writes } = storage(t, JSON.stringify(expected));
  assert.deepEqual(loadProgress(), expected);
  saveProgress(expected);
  assert.deepEqual(writes, [[key, JSON.stringify(expected)]]);
  assert.deepEqual(loadProgress(), expected);
  assert.equal(totalStars(expected), 7);
});

for (const raw of [null, '{bad json', 'null', '{}']) {
  test(`missing or unreadable save starts fresh: ${raw}`, t => {
    storage(t, raw);
    assert.deepEqual(loadProgress(), { stars: {}, muted: false });
  });
}

test('blocked localStorage getter cannot stop loading or saving', t => {
  storage(t);
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  assert.deepEqual(loadProgress(), { stars: {}, muted: false });
  assert.doesNotThrow(() => saveProgress({ stars: {}, muted: false }));
});

test('quota failure preserves earned stars in memory', t => {
  storage(t);
  window.localStorage.setItem = () => { throw new Error('quota'); };
  const progress = loadProgress();
  assert.equal(recordLevelStars(progress, 'schoolyard', 2), true);
  assert.equal(progress.stars.schoolyard, 2);
});

test('only improvements write saves and unlock the next venue', t => {
  const { writes } = storage(t);
  const progress = loadProgress();
  assert.equal(isLevelUnlocked(progress, CAMPAIGN_LEVELS, 0), true);
  assert.equal(isLevelUnlocked(progress, CAMPAIGN_LEVELS, 1), false);
  assert.equal(recordLevelStars(progress, 'schoolyard', 0), false);
  assert.equal(recordLevelStars(progress, 'schoolyard', 2), true);
  assert.equal(recordLevelStars(progress, 'schoolyard', 1), false);
  assert.equal(recordLevelStars(progress, 'schoolyard', 2), false);
  assert.equal(isLevelUnlocked(progress, CAMPAIGN_LEVELS, 1), true);
  assert.equal(isLevelUnlocked(progress, CAMPAIGN_LEVELS, 2), false);
  assert.equal(writes.length, 1);
  assert.equal(recordLevelStars(progress, 'schoolyard', 3), true);
  assert.equal(totalStars(loadProgress()), 3);
});

test('null stars in valid JSON must recover to a usable empty map', t => {
  storage(t, '{"stars":null,"muted":true}');
  const progress = loadProgress();
  assert.equal(totalStars(progress), 0);
  assert.deepEqual(progress, { stars: {}, muted: false });
});

for (const stars of [[1, 2, 3], '3', 3, false]) {
  test(`invalid stars container ${JSON.stringify(stars)} becomes empty`, t => {
    storage(t, JSON.stringify({ stars, muted: true }));
    assert.deepEqual(loadProgress(), { stars: {}, muted: false });
  });
}

test('invalid star values are discarded while valid integers and venue IDs survive', t => {
  storage(t, JSON.stringify({ stars: {
    schoolyard: 0, kiosk: 1, veranda: 2, nightbulb: 3, 'future-venue': 2,
    negative: -1, excessive: 4, fractional: 1.5, string: '3',
    boolean: true, nil: null, array: [3], object: { stars: 3 },
  }, muted: false }));
  const progress = loadProgress();
  assert.deepEqual(progress.stars, { schoolyard: 0, kiosk: 1, veranda: 2, nightbulb: 3, 'future-venue': 2 });
  assert.equal(totalStars(progress), 8);
  assert.equal(isLevelUnlocked(progress, CAMPAIGN_LEVELS, 1), false);
  saveProgress(progress);
  assert.deepEqual(loadProgress(), progress);
});

test('a mute saved by an earlier visit loads as sound on, keeping everything else', t => {
  storage(t, JSON.stringify({ stars: { kiosk: 2 }, muted: true, musicVolume: 0.35, effectsOff: true }));
  const progress = loadProgress();
  assert.equal(progress.muted, false);
  assert.deepEqual(progress.stars, { kiosk: 2 });
  assert.equal(progress.musicVolume, 0.35, 'the Music level still carries over');
  assert.equal(progress.effectsOff, true, 'Effects off still carries over');
});
