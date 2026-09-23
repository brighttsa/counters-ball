import test from 'node:test';
import assert from 'node:assert/strict';
import { THREE } from './helpers/real-three-session-fixture.mjs';
import { KeyboardFlickAim, keyboardAction } from '../src/gameplay/keyboard-flick-aim.js';
import { MAX_PULL, MAX_FLICK_SPEED } from '../src/core/pitch-dimensions-and-constants.js';

// A stand-in for the drag input: the keyboard aim shares its selection, pull, visuals and callbacks.
function host({ turn = 'home' } = {}) {
  const calls = [];
  const cap = (side, x, y) => ({ side, body: { pos: new THREE.Vector2(x, y) } });
  const h = {
    entries: [cap('home', -0.5, 0), cap('home', -1, 0.4), cap('away', 0.5, 0)],
    ballBody: { pos: new THREE.Vector2(0, 0) },
    canControl: (side) => side === turn,
    pull: new THREE.Vector2(),
    selected: null,
    domElement: { classList: { add: () => {}, remove: () => {} } },
    visuals: { show: (body) => calls.push(['show', body]), hide: () => calls.push(['hide']) },
    juice: { press: () => {}, release: (entry) => calls.push(['release', entry]) },
    onAimStart: (entry) => calls.push(['aimStart', entry]),
    onFlick: (entry, velocity, gesture) => calls.push(['flick', entry, velocity, gesture]),
    clearSelection() { this.selected = null; calls.push(['clear']); },
  };
  return { h, calls, aim: new KeyboardFlickAim(h) };
}

test('keys map to aim actions, case-insensitively, and ignore everything else', () => {
  assert.equal(keyboardAction('ArrowLeft'), 'left');
  assert.equal(keyboardAction('D'), 'right');
  assert.equal(keyboardAction(' '), 'fire');
  assert.equal(keyboardAction('Escape'), 'cancel');
  assert.equal(keyboardAction('c'), null, 'C still cycles the camera');
  assert.equal(keyboardAction('1'), null, 'number keys still pick camera modes');
});

test('the first key picks up the cap nearest the ball, aimed at the ball', () => {
  const { h, calls, aim } = host();
  aim.act('fire');
  assert.equal(h.selected, h.entries[0]);
  assert.ok(aim.aiming);
  assert.equal(calls.filter(([c]) => c === 'aimStart').length, 1);
  assert.ok(h.pull.x > 0 && Math.abs(h.pull.y) < 1e-9, 'pointing from the cap toward the ball');
  assert.ok(calls.every(([c]) => c !== 'flick'), 'the first press never shoots');
});

test('a keyboard flick has the same speed a drag of that length would', () => {
  const { h, calls, aim } = host();
  aim.act('up'); // picks up at half power, then +5%
  aim.act('fire');
  const [, entry, velocity, gesture] = calls.find(([c]) => c === 'flick');
  assert.equal(entry, h.entries[0]);
  assert.ok(Math.abs(velocity.length() - 0.55 * MAX_FLICK_SPEED) < 1e-9);
  assert.equal(gesture.boost, 1, 'no draw-speed bonus');
  assert.equal(aim.aiming, false);
  assert.equal(h.selected, null);
});

test('arrows turn the aim and clamp the power; Q/E switch caps; Escape puts the cap down', () => {
  const { h, calls, aim } = host();
  aim.act('right');
  assert.ok(h.pull.y > 0, 'right turns the aim clockwise as seen from above');
  for (let i = 0; i < 30; i++) aim.act('up');
  assert.ok(Math.abs(h.pull.length() - MAX_PULL) < 1e-9, 'power stops at full');
  for (let i = 0; i < 30; i++) aim.act('down');
  assert.ok(h.pull.length() > 0, 'power never drops to nothing');
  aim.act('next');
  assert.equal(h.selected, h.entries[1]);
  aim.act('prev');
  assert.equal(h.selected, h.entries[0]);
  aim.putDown();
  assert.equal(aim.aiming, false);
  assert.ok(calls.some(([c, e]) => c === 'release' && e === h.entries[0]));
});

test('nothing happens when it is not your turn', () => {
  const { h, aim } = host({ turn: 'away-ai' });
  assert.equal(aim.act('fire'), false);
  assert.equal(h.selected, null);
});
