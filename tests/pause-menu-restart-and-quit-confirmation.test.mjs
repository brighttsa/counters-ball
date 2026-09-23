import test from 'node:test';
import assert from 'node:assert/strict';
import { createMenuActions } from '../src/ui/menu-button-action-routes.js';

// Restart and Quit throw a match away, so once a flick has been played they need a second press.
function setup({ flicks = 1, phase = 'aiming', attract = false } = {}) {
  const calls = [];
  const app = { levelIndex: 2, mode: 'legends', session: {
    options: { isAttract: attract }, rules: { phase, flicksUsed: { home: flicks, away: 0 } } } };
  const flow = {
    prepareMatch: (i) => calls.push(['restart', i]), showLevels: () => calls.push(['quit']),
    setPaused: (p) => calls.push(['paused', p]),
  };
  const routes = createMenuActions({ app, progress: {}, flow });
  const button = (text) => ({ textContent: text, dataset: {} });
  return { routes, calls, button, app };
}

test('before any flick, Restart and Quit act on the first press', () => {
  const { routes, calls, button } = setup({ flicks: 0 });
  routes.restart(button('Restart match'));
  routes.quit(button('Quit to Acts'));
  assert.deepEqual(calls, [['restart', 2], ['quit']]);
});

test('mid-match, the first press arms the button and only the second acts', () => {
  const { routes, calls, button } = setup();
  const restart = button('Restart match');
  routes.restart(restart);
  assert.deepEqual(calls, []);
  assert.equal(restart.textContent, 'Sure? Press again to restart');
  routes.restart(restart);
  assert.deepEqual(calls, [['restart', 2]]);
  assert.equal(restart.textContent, 'Restart match', 'the label comes back after acting');
  const quit = button('Quit to Acts');
  routes.quit(quit);
  routes.quit(quit);
  assert.deepEqual(calls.at(-1), ['quit']);
});

test('reopening the pause menu disarms a button pressed once before', () => {
  const { routes, calls, button } = setup();
  const restart = button('Restart match');
  routes.restart(restart);
  routes.pause();
  assert.equal(restart.textContent, 'Restart match');
  routes.restart(restart);
  assert.deepEqual(calls, [['paused', true]], 'a fresh pause needs the confirmation again');
});

test('a finished match or the attract match never asks', () => {
  for (const options of [{ phase: 'ended' }, { attract: true }]) {
    const { routes, calls, button } = setup(options);
    routes.quit(button('Quit to Acts'));
    assert.deepEqual(calls, [['quit']]);
  }
});
