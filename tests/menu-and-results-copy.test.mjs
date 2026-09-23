import test from 'node:test';
import assert from 'node:assert/strict';
import { STREET_LEGENDS_ACTS } from '../src/levels/street-legends-acts-and-unlocks.js';

// The smallest DOM these UI modules touch: elements by id, created elements, style properties.
function element() {
  const props = new Map();
  return {
    textContent: '', hidden: false, dataset: {}, children: [], className: '',
    style: { setProperty: (k, v) => props.set(k, v), getPropertyValue: (k) => props.get(k) ?? '' },
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {}, querySelector: () => element(), querySelectorAll: () => [],
    replaceChildren(...nodes) {
      this.children = nodes;
      this.textContent = nodes.map((n) => (typeof n === 'string' ? n : n.textContent)).join('');
    },
    set innerHTML(_) { this.lastChild = element(); },
  };
}
const elements = new Map();
globalThis.document = {
  getElementById: (id) => elements.get(id) ?? elements.set(id, element()).get(id),
  createElement: () => element(),
  body: element(),
};
globalThis.window = { matchMedia: () => ({ matches: false }) };

const { FullTimeResultsCard, fullTimeNote } = await import('../src/ui/ui-full-time-results-card.js');
const { fillVenuePreview } = await import('../src/ui/ui-circuit-venue-preview.js');
const act = (backdrop, number) => STREET_LEGENDS_ACTS.find((a) => a.backdrop === backdrop && a.legend.act === number);

test('a Street Legends win away from Roadside never mentions the toll booms', () => {
  const card = new FullTimeResultsCard();
  const level = act('veranda', 1);
  card.fill({ winner: 'home', scores: { home: 1, away: 0 }, starFlags: [true, true, false] }, level, 'legends',
    { hasNext: true, improved: true, isFinalVenue: false, onStar() {}, homeColour: '#d6503a' });
  card.cancelReveal();
  const note = document.getElementById('results-note').textContent;
  assert.doesNotMatch(note, /boom/i);
  assert.equal(note, `${level.opponent.kid} gives you the table. Next act unlocked.`);
});

test('the full-time score is chalked per side in team colours', () => {
  const card = new FullTimeResultsCard();
  const level = act('kiosk', 2);
  card.fill({ winner: 'away', scores: { home: 0, away: 2 }, starFlags: [false, false, false] }, level, 'legends',
    { hasNext: false, improved: false, isFinalVenue: false, onStar() {}, homeColour: '#d6503a' });
  const score = document.getElementById('results-score');
  assert.equal(score.textContent, '0 — 2');
  const [home, , away] = score.children;
  assert.equal(home.className, 'chalk-side');
  assert.equal(home.style.getPropertyValue('--chalk-team'), '#d6503a');
  assert.equal(away.style.getPropertyValue('--chalk-team'), level.opponent.team.hudColor);
});

test('running out of flicks in a solo challenge never names the Roadside lanes', () => {
  const solo = STREET_LEGENDS_ACTS.filter((a) => a.rules.awayFlickLimit === 0);
  assert.ok(solo.length > 0);
  for (const level of solo) {
    const note = fullTimeNote({ winner: null }, level, 'legends', {});
    assert.doesNotMatch(note, /amber|lane|boom/i, level.id);
  }
});

test('the venue panel names the opponent in one consistent style', () => {
  const level = act('roadside', 2);
  document.getElementById('level-grid');
  fillVenuePreview(level, 0, true, 'legends', 0, 'Late afternoon');
  const line = document.getElementById('circuit-venue-opponent').textContent;
  assert.equal(line, `${level.opponent.kid} · ${level.opponent.team.name} · Medium`);
});
