import test from 'node:test';
import assert from 'node:assert/strict';
import { AttractModeCallout, createAttractHud } from '../src/ui/attract-mode-callout.js';

const fakeEl = () => ({ hidden: true, textContent: '', classList: { set: new Set(),
  add(c) { this.set.add(c); }, remove(c) { this.set.delete(c); } } });

test('a goal in the title-screen match shows the scorer and the score', () => {
  const el = fakeEl();
  const hud = createAttractHud(new AttractModeCallout(el, () => true));
  hud.setScore({ home: 2, away: 1 }, 'home');
  hud.goal('Kofi finds the corner');
  assert.equal(el.hidden, false);
  assert.equal(el.textContent, 'GOAL! Kofi finds the corner · 2-1');
});

test('a goal detail that already carries the score is not scored twice', () => {
  const el = fakeEl();
  const callout = new AttractModeCallout(el, () => true);
  callout.setScore({ home: 1, away: 0 });
  callout.goal('Top bins / 1-0');
  assert.equal(el.textContent, 'GOAL! Top bins / 1-0');
  callout.hide();
});

test('every other HUD call from the attract match is ignored and hide() clears the callout', () => {
  const el = fakeEl();
  const callout = new AttractModeCallout(el, () => true);
  const hud = createAttractHud(callout);
  assert.doesNotThrow(() => { hud.show(false); hud.setFlicks(3); hud.tutorial('x'); });
  callout.goal('Late winner');
  callout.hide();
  assert.equal(el.hidden, true);
});

test('goals scored while another menu covers the title screen stay silent', () => {
  const el = fakeEl();
  const callout = new AttractModeCallout(el, () => false);
  callout.goal('Nobody sees this');
  assert.equal(el.hidden, true);
});
