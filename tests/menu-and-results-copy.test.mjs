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

const { MatchHud } = await import('../src/ui/ui-match-hud-pause-and-results.js');
const { fillVenuePreview } = await import('../src/ui/ui-circuit-venue-preview.js');
const act = (backdrop, number) => STREET_LEGENDS_ACTS.find((a) => a.backdrop === backdrop && a.legend.act === number);

test('a Street Legends win away from Roadside never mentions the toll booms', () => {
  const hud = new MatchHud();
  const level = act('veranda', 1);
  hud.fillResults({ winner: 'home', scores: { home: 1, away: 0 }, starFlags: [true, true, false] }, level, 'legends',
    { hasNext: true, improved: true, isFinalVenue: false, onStar() {} });
  hud.cancelResultReveal();
  const note = document.getElementById('results-note').textContent;
  assert.doesNotMatch(note, /boom/i);
  assert.equal(note, `${level.opponent.kid} gives you the table. Next act unlocked.`);
});

test('the full-time score is chalked per side in team colours', () => {
  const hud = new MatchHud();
  const level = act('kiosk', 2);
  hud.fillResults({ winner: 'away', scores: { home: 0, away: 2 }, starFlags: [false, false, false] }, level, 'legends',
    { hasNext: false, improved: false, isFinalVenue: false, onStar() {} });
  const score = document.getElementById('results-score');
  assert.equal(score.textContent, '0 — 2');
  const [home, , away] = score.children;
  assert.equal(home.className, 'chalk-side');
  assert.equal(away.style.getPropertyValue('--chalk-team'), level.opponent.team.hudColor);
});

test('the venue panel names the opponent in one consistent style', () => {
  const level = act('roadside', 2);
  document.getElementById('level-grid');
  fillVenuePreview(level, 0, true, 'legends', 0, 'Late afternoon');
  const line = document.getElementById('circuit-venue-opponent').textContent;
  assert.equal(line, `${level.opponent.kid} · ${level.opponent.team.name} · Medium`);
});
