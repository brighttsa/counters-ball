import test from 'node:test';
import assert from 'node:assert/strict';
import '../tests/helpers/real-three-session-fixture.mjs';
import { STREET_LEGENDS_ACTS } from '../src/levels/street-legends-acts-and-unlocks.js';
import { pickFeaturedLegendAct, featuredActCopy, FIRST_VISIT_ACT_ID } from '../src/levels/featured-home-legends-act.js';
import { loadProgress } from '../src/core/save-progress-local-storage.js';

const { tallyGroups, nearTouchlineSign } = await import('../src/scene/chalk-table-score-and-flick-tallies.js');
const acts = STREET_LEGENDS_ACTS;
const indexOf = (id) => acts.findIndex((act) => act.id === id);
const idAt = (i) => acts[i].id;

test('first visit features the Roadside opener', () => {
  assert.equal(idAt(pickFeaturedLegendAct(acts, { stars: {} })), FIRST_VISIT_ACT_ID);
  assert.equal(idAt(pickFeaturedLegendAct(acts, { stars: {}, lastLegendAct: 'no-such-act' })), FIRST_VISIT_ACT_ID);
});

test('a won opener with no play history moves on to Act 2', () => {
  const opener = indexOf(FIRST_VISIT_ACT_ID);
  assert.equal(pickFeaturedLegendAct(acts, { stars: { [FIRST_VISIT_ACT_ID]: 3 } }), opener + 1);
});

test('the home screen follows the last act played', () => {
  const kioskOne = acts.findIndex((act) => act.backdrop === 'kiosk' && act.legend.act === 1);
  const lost = { stars: {}, lastLegendAct: idAt(kioskOne) };
  assert.equal(pickFeaturedLegendAct(acts, lost), kioskOne, 'an unwon act stays featured');
  const won = { stars: { [idAt(kioskOne)]: 2 }, lastLegendAct: idAt(kioskOne) };
  assert.equal(pickFeaturedLegendAct(acts, won), kioskOne + 1, 'a won act advances to the next act');
  assert.equal(acts[kioskOne + 1].legend.act, 2);
});

test('winning a venue finale stays on that finale instead of jumping venues', () => {
  const finale = acts.findIndex((act) => act.backdrop === 'schoolyard' && act.legend.act === act.legend.acts);
  const progress = { stars: { [idAt(finale)]: 3 }, lastLegendAct: idAt(finale) };
  assert.equal(pickFeaturedLegendAct(acts, progress), finale);
});

test('home copy names the act and uses a short venue word on the button', () => {
  const jamestown = acts.find((act) => act.backdrop === 'night');
  const copy = featuredActCopy(jamestown);
  assert.equal(copy.button, 'Play Jamestown');
  assert.match(copy.kicker, /^ACT \d \/ 3$/);
  assert.equal(featuredActCopy(acts[indexOf(FIRST_VISIT_ACT_ID)]).button, 'Play Roadside');
});

test('saved progress keeps only a valid last act and scoreboard style', (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  t.after(() => { if (original) Object.defineProperty(globalThis, 'window', original); else delete globalThis.window; });
  const load = (value) => {
    Object.defineProperty(globalThis, 'window', { configurable: true,
      value: { localStorage: { getItem: () => JSON.stringify(value) } } });
    return loadProgress();
  };
  assert.deepEqual(load({ stars: {}, lastLegendAct: 'legends-kiosk-act-2', hudStyle: 'broadcast' }),
    { stars: {}, muted: false, lastLegendAct: 'legends-kiosk-act-2', hudStyle: 'broadcast' });
  assert.deepEqual(load({ stars: {}, lastLegendAct: 7, hudStyle: 'neon' }), { stars: {}, muted: false },
    'unknown styles fall back to the chalk default');
});

test('remaining flicks chalk as gates of five, a number past twenty-five', () => {
  assert.deepEqual(tallyGroups(14), [5, 5, 4]);
  assert.deepEqual(tallyGroups(10), [5, 5]);
  assert.deepEqual(tallyGroups(0), []);
  assert.deepEqual(tallyGroups(25), [5, 5, 5, 5, 5]);
  assert.equal(tallyGroups(26), null);
});

test('chalk sits on the near touchline and does not flicker near the pitch axis', () => {
  assert.equal(nearTouchlineSign(3, -1), 1);
  assert.equal(nearTouchlineSign(-3, 1), -1);
  assert.equal(nearTouchlineSign(0.1, -1), -1, 'portrait camera near the axis keeps the previous side');
  assert.equal(nearTouchlineSign(-0.1, 1), 1);
});

test('the chalk board survives a missing font API and a redraw that fails after the font loads', async () => {
  const { THREE } = await import('../tests/helpers/real-three-session-fixture.mjs');
  const { createChalkTableScoreboard } = await import('../src/scene/chalk-table-score-and-flick-tallies.js');
  // The smallest 2D canvas the chalk drawing needs: every method is a no-op, measureText has a width.
  const ctx = new Proxy({}, {
    get: (target, key) => (key in target ? target[key] : () => ({ width: 10 })),
    set: (target, key, value) => { target[key] = value; return true; },
  });
  const canvas = { width: 0, height: 0, getContext: () => { ctx.canvas = canvas; return ctx; } };
  const previous = globalThis.document;
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    globalThis.document = { createElement: () => canvas, fonts: { load: () => undefined } };
    assert.doesNotThrow(() => createChalkTableScoreboard(new THREE.Group(), '#d6503a', '#4f86c6'));

    let fontLoaded;
    globalThis.document.fonts.load = () => new Promise((resolve) => { fontLoaded = resolve; });
    createChalkTableScoreboard(new THREE.Group(), '#d6503a', '#4f86c6');
    ctx.clearRect = () => { throw new Error('context lost'); };
    fontLoaded();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', onUnhandled);
    globalThis.document = previous;
  }
});
