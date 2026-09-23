import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchOrientationGate } from '../src/ui/match-orientation-prompt.js';

function fixture() {
  const state = { portrait: true, visible: false, starts: 0 };
  const gate = new MatchOrientationGate({ isPortrait: () => state.portrait,
    show: () => { state.visible = true; }, hide: () => { state.visible = false; } });
  const start = () => { state.starts++; };
  return { state, gate, start };
}
test('portrait entry waits without creating a match; landscape starts exactly once', () => {
  const { state, gate, start } = fixture();
  assert.equal(gate.offer(start), true);
  assert.equal(state.starts, 0);
  gate.resize(); assert.equal(state.starts, 0);
  state.portrait = false; gate.resize(); gate.resize(); gate.continue();
  assert.equal(state.starts, 1); assert.equal(state.visible, false);
});
test('portrait remains playable and the prompt does not repeat during the session', () => {
  const { state, gate, start } = fixture();
  gate.offer(start); gate.continue();
  assert.equal(state.starts, 1);
  assert.equal(gate.offer(start), false);
  assert.equal(state.visible, false);
});
test('back discards pending entry and rotation cannot launch a cancelled match', () => {
  const { state, gate, start } = fixture();
  gate.offer(start); gate.cancel(); state.portrait = false; gate.resize();
  assert.equal(state.starts, 0); assert.equal(state.visible, false);
  state.portrait = true; assert.equal(gate.offer(start), true);
});
test('landscape entry never opens a prompt or intercepts the caller', () => {
  const { state, gate, start } = fixture(); state.portrait = false;
  assert.equal(gate.offer(start), false);
  assert.equal(state.visible, false); assert.equal(state.starts, 0);
});
