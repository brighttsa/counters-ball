import test from 'node:test';
import assert from 'node:assert/strict';
import { KineticEventCallout } from '../src/ui/ui-kinetic-event-callout.js';

function setup(reduced = false) {
  globalThis.window = { matchMedia: () => ({ matches: reduced }) };
  const nodes = {};
  const root = { style: {}, querySelector: name => nodes[name] ??= {} };
  return { root, callout: new KineticEventCallout(root) };
}

test('replacement preserves current callout opacity and position', () => {
  const { root, callout } = setup();
  callout.event('BOUNCE', { priority: 1 });
  callout.update(.07);
  const before = { ...root.style };
  callout.event('GOAL', { priority: 10, direction: -1 });
  assert.deepEqual(root.style, before);
  assert.equal(callout.event('LOW', { priority: 1 }), false);
  callout.update(.2);
  assert.equal(root.style.opacity, '1');
  assert.equal(root.style.transform, 'translateX(0px) translateY(0px) scale(1)');
});

test('reduced-motion callouts fade without travel and clear on time', () => {
  const { root, callout } = setup(true);
  callout.event('GOAL', { duration: 1 });
  assert.equal(root.style.opacity, '0');
  callout.update(.07);
  assert.equal(Number(root.style.opacity), 1 - .5 ** 5, 'eased entrance: mostly in by half time');
  assert.equal(root.style.transform, 'translateX(0px) translateY(0px) scale(1)');
  callout.update(.85);
  assert.ok(Number(root.style.opacity) < 1);
  callout.update(.1);
  assert.equal(root.hidden, true);
  delete globalThis.window;
});
