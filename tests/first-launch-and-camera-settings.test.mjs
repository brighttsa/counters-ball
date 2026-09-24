import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMERA_VIEWS, viewName } from '../src/ui/camera-view-icons-and-copy.js';
import { createMenuActions } from '../src/ui/menu-button-action-routes.js';

// The routing table with stand-ins that record what each route asked for.
function routes() {
  const calls = [], saved = [];
  const control = { mode: 'broadcast', select(mode) { this.mode = mode; calls.push(['select', mode]); } };
  const actions = createMenuActions({
    app: { mode: 'legends', session: null }, progress: { stars: {} }, save: (p) => saved.push({ ...p }),
    flow: { prepareMatch: (i) => calls.push(['prepareMatch', i]), featuredIndex: () => 4, setPaused: () => {}, showLevels: () => {} },
    cameraDirector: { playerControl: control }, menus: { setFirstLaunch: (v) => calls.push(['firstLaunch', v]) },
    hints: { reset: () => calls.push(['hintsReset']) },
  });
  return { actions, calls, saved, control };
}

test('every camera view has a name, a purpose and an icon; the three presets have keys', () => {
  assert.deepEqual(Object.keys(CAMERA_VIEWS), ['tactical', 'broadcast', 'street', 'free']);
  for (const view of Object.values(CAMERA_VIEWS)) assert.ok(view.label && view.purpose && view.icon.startsWith('<svg'));
  assert.deepEqual(['tactical', 'broadcast', 'street'].map(m => CAMERA_VIEWS[m].key), ['1', '2', '3']);
  assert.equal(viewName('street', true), 'Street Level · 3');
  assert.equal(viewName('street', false), 'Street Level', 'no key on touch screens');
  assert.equal(viewName('free', true), 'Free Camera', 'Free has no key of its own');
});

test('"Just play" on first launch skips practice for good and starts the featured act', () => {
  const { actions, calls, saved } = routes();
  actions['skip-practice']();
  assert.equal(saved.at(-1).practiceSkipped, true);
  assert.deepEqual(calls, [['firstLaunch', false], ['prepareMatch', 4]]);
});

test('the pause menu steps through all four views in order and can bring the tips back', () => {
  const { actions, calls, control } = routes();
  const button = { dataset: {} };
  for (const expected of ['street', 'free', 'tactical', 'broadcast']) {
    actions['cycle-camera-view'](button);
    assert.equal(control.mode, expected);
  }
  assert.equal(button.dataset.value, 'Broadcast');
  const tips = { dataset: {} };
  actions['reset-hints'](tips);
  assert.deepEqual(calls.at(-1), ['hintsReset']);
  assert.equal(tips.dataset.value, 'On');
});
