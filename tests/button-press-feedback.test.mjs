import test from 'node:test';
import assert from 'node:assert/strict';
import { installButtonPressFeedback } from '../src/ui/button-press-feedback.js';

function setup() {
  const calls = [], listeners = {};
  const sound = { unlock: () => calls.push('unlock'), uiTick: () => calls.push('tick'), uiSelect: () => calls.push('select'), uiLocked: () => calls.push('locked') };
  const root = { addEventListener: (type, fn) => { listeners[type] = fn; } };
  const buzz = [];
  globalThis.navigator ??= {};
  Object.defineProperty(globalThis, 'navigator', { value: { vibrate: (ms) => buzz.push(ms) }, configurable: true });
  const pressed = installButtonPressFeedback(sound, root);
  const button = (classes = [], extra = {}) => ({ disabled: false, id: '', getAttribute: () => null,
    classList: { contains: (c) => classes.includes(c) }, closest() { return this; }, ...extra });
  return { calls, buzz, pressed, button, press: (el) => listeners.pointerdown({ target: el }) };
}

test('a button clicks and buzzes the moment it is pressed, and the click that follows stays quiet', () => {
  const { calls, buzz, pressed, button, press } = setup();
  const play = button(['btn', 'btn-primary']);
  press(play);
  assert.deepEqual(calls, ['unlock', 'select']);
  assert.deepEqual(buzz, [8]);
  assert.equal(pressed(play), true);
  assert.equal(pressed(button()), false, 'keyboard activation of another button still gets its sound');
});

test('locked cards thud, plain buttons tick, disabled buttons and the start gate stay silent', () => {
  const { calls, button, press } = setup();
  press(button(['locked']));
  press(button());
  press(button([], { disabled: true }));
  press(button([], { id: 'boot-start' }));
  assert.deepEqual(calls, ['unlock', 'locked', 'unlock', 'tick']);
});
