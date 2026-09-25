import test from 'node:test';
import assert from 'node:assert/strict';

function fakePage() {
  const listeners = { window: {}, boot: {} };
  const classes = new Set(['is-loading']);
  const on = (bag) => ({
    addEventListener: (t, fn) => { (bag[t] ??= []).push(fn); },
    removeEventListener: (t, fn) => { bag[t] = (bag[t] ?? []).filter((f) => f !== fn); },
  });
  const button = { hidden: true, focus() { this.focused = true; } };
  const boot = { ...on(listeners.boot), attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, querySelector: () => button };
  globalThis.window = on(listeners.window);
  globalThis.document = { body: { classList: { add: (...c) => c.forEach((x) => classes.add(x)), remove: (...c) => c.forEach((x) => classes.delete(x)) } } };
  const fire = (bag, type, extra = {}) => {
    const event = { type, stopped: false, prevented: false, ...extra,
      preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
    for (const fn of [...(listeners[bag][type] ?? [])]) fn(event);
    return event;
  };
  return { boot, button, classes, fire };
}

test('the start screen waits for a first gesture, starts once, and keeps that gesture to itself', async () => {
  const { openTapToPlayGate } = await import('../src/ui/tap-to-play-start-gate.js');
  const page = fakePage();
  let starts = 0;
  openTapToPlayGate(page.boot, () => { starts += 1; });
  assert.ok(page.classes.has('awaiting-start') && page.classes.has('is-loading'), 'still covering the game');
  assert.equal(page.button.hidden, false);
  assert.equal(page.button.focused, true, 'keyboard users can press Enter straight away');

  const shortcut = page.fire('window', 'keydown', { key: 'r', metaKey: true });
  assert.equal(starts, 0, 'browser shortcuts do not start the game');
  assert.equal(shortcut.stopped, false);

  const enter = page.fire('window', 'keydown', { key: 'Enter' });
  assert.equal(starts, 1);
  assert.ok(enter.stopped && enter.prevented, 'the starting key must not also press Play underneath');
  assert.ok(!page.classes.has('is-loading') && !page.classes.has('awaiting-start'));
  assert.equal(page.boot.attrs['aria-hidden'], 'true');

  page.fire('boot', 'click');
  page.fire('window', 'keydown', { key: ' ' });
  assert.equal(starts, 1, 'later taps and keys belong to the game again');
  delete globalThis.window;
  delete globalThis.document;
});
