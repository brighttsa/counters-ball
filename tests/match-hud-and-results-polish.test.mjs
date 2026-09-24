import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers/real-three-session-fixture.mjs';
import { STREET_LEGENDS_ACTS } from '../src/levels/street-legends-acts-and-unlocks.js';

const matchPointCalls = calls => calls.filter(([name, label]) => name === 'hud.event' && label === 'MATCH POINT');

test('a first-to-1 table never shouts MATCH POINT; a longer match still does at the brink', () => {
  const short = fixture({ goalsToWin: 1 });
  short.s.presentation.turn('home');
  assert.equal(matchPointCalls(short.calls).length, 0);

  const long = fixture({ goalsToWin: 2 });
  assert.equal(matchPointCalls(long.calls).length, 0, 'not at 0-0');
  long.s.rules.scores.home = 1;
  long.s.presentation.turn('home');
  assert.equal(matchPointCalls(long.calls).length, 1);
});

// Just enough DOM for the results card: elements by id whose classes and attributes are recorded.
function element() {
  const classes = new Set();
  return {
    textContent: '', hidden: false, dataset: {}, children: [], className: '', attributes: {},
    style: { setProperty() {}, getPropertyValue: () => '' },
    classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c),
      toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) },
    setAttribute(k, v) { this.attributes[k] = String(v); }, querySelector: () => element(), querySelectorAll: () => [],
    replaceChildren(...nodes) { this.children = nodes; },
    set innerHTML(_) { this.lastChild = element(); },
  };
}

test('the results card leads with Next act after a win and with Play again after a loss or draw', async () => {
  const elements = new Map();
  globalThis.document = { getElementById: id => elements.get(id) ?? elements.set(id, element()).get(id), createElement: element };
  try {
    const { FullTimeResultsCard } = await import('../src/ui/ui-full-time-results-card.js');
    const card = new FullTimeResultsCard();
    const level = STREET_LEGENDS_ACTS[0];
    const fill = (winner, hasNext) => {
      card.fill({ winner, scores: { home: winner === 'home' ? 1 : 0, away: winner === 'away' ? 1 : 0 }, starFlags: [false, false, false] },
        level, 'legends', { hasNext, improved: false, isFinalVenue: false, onStar() {}, homeColour: '#d6503a' });
      card.cancelReveal();
      const primary = id => document.getElementById(id).classList.contains('btn-primary');
      return { replay: primary('btn-replay'), next: primary('btn-next') };
    };
    assert.deepEqual(fill('home', true), { replay: false, next: true });
    assert.deepEqual(fill('away', true), { replay: true, next: false }, 'a loss with the next act already open');
    assert.deepEqual(fill('away', false), { replay: true, next: false });
    assert.deepEqual(fill(null, true), { replay: true, next: false }, 'a draw');
  } finally { delete globalThis.document; }
});
