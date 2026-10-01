import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const code = await readFile(new URL('../src/ui/room-format-picker.js', import.meta.url), 'utf8');

function setup() {
  const handlers = {}, documentHandlers = {};
  const value = { value: 'duel' }, label = { textContent: 'Head-to-head match' };
  const summary = { focused: false, focus() { this.focused = true; } };
  const picker = {
    open: true, querySelector: () => summary,
    addEventListener: (name, fn) => { handlers[name] = fn; },
    contains: (target) => target === summary,
  };
  const elements = { 'room-format-picker': picker, 'live-room-format': value, 'room-format-value': label };
  runInNewContext(code, { document: {
    getElementById: (id) => elements[id],
    addEventListener: (name, fn) => { documentHandlers[name] = fn; },
  } });
  return { handlers, documentHandlers, picker, summary, value, label };
}

test('choosing knockout updates the actual room payload mode and closes on click', () => {
  const state = setup();
  const target = {
    name: 'room-format-choice', value: 'tournament', matches: () => true,
    closest: () => ({ querySelector: () => ({ textContent: 'Four-player knockout' }) }),
  };
  state.handlers.change({ target });
  assert.equal(state.value.value, 'tournament');
  assert.equal(state.label.textContent, 'Four-player knockout');
  assert.equal(state.picker.open, true);
  state.handlers.click({ target });
  assert.equal(state.picker.open, false);
  assert.equal(state.summary.focused, true);
});

test('Escape dismisses and returns focus, while radio arrow keys remain native', () => {
  const state = setup();
  let prevented = false;
  state.handlers.keydown({ key: 'ArrowDown', target: { matches: () => true } });
  assert.equal(state.picker.open, true);
  state.handlers.keydown({ key: 'Escape', preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(state.picker.open, false);
  assert.equal(state.summary.focused, true);
});

test('outside pointer or focus dismisses without stealing focus', () => {
  const state = setup();
  state.documentHandlers.pointerdown({ target: {} });
  assert.equal(state.picker.open, false);
  assert.equal(state.summary.focused, false);
  state.picker.open = true;
  state.documentHandlers.focusin({ target: state.summary });
  assert.equal(state.picker.open, true);
  state.documentHandlers.focusin({ target: {} });
  assert.equal(state.picker.open, false);
});
