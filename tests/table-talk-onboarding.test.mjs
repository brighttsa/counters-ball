import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, connect } from './helpers/table-talk-controller-harness.mjs';

test('private-room voice setup is optional and starts with microphone off', () => {
  const h = setup();
  try {
    h.voice.configure('room123456', true);
    assert.equal(h.root.hidden, false);
    assert.equal(h.setupPanel.hidden, false);
    assert.equal(h.setupJoin.hidden, false);
    assert.equal(h.controls.get('[data-voice-action="mic"]').hidden, true);
    h.voice.configure(null, false);
    assert.equal(h.root.hidden, true);
    assert.equal(h.setupPanel.hidden, true);
  } finally { h.restore(); }
});

test('healthy connection auto-collapses once, announces mic-off, and moves focus safely', async () => {
  const h = setup();
  try {
    await connect(h);
    const toggle = h.controls.get('[data-table-talk-toggle]');
    const actions = h.controls.get('[data-table-talk-actions]');
    assert.equal(h.root.dataset.compact, 'true');
    assert.equal(toggle.hidden, false);
    assert.equal(toggle.textContent, 'Voice · Mic off');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.match(toggle.getAttribute('aria-label'), /Microphone off/);
    assert.equal(h.controls.get('[data-table-talk-live-status]').textContent, 'Connected · mic off');
    assert.equal(actions.hidden, true);
    assert.equal(h.document.activeElement, toggle);
    assert.ok(h.document.focusHistory.indexOf(h.controls.get('[data-table-talk-status]')) < h.document.focusHistory.indexOf(toggle));
    assert.equal(h.captures(), 0);
  } finally { await h.voice.leave(); h.restore(); }
});

test('room-setup Join preserves focus while its setup card is hidden', async () => {
  const h = setup();
  try {
    await connect(h, true);
    assert.equal(h.setupPanel.hidden, true);
    assert.equal(h.document.activeElement, h.controls.get('[data-table-talk-toggle]'));
    assert.ok(h.document.focusHistory.indexOf(h.controls.get('[data-table-talk-status]')) < h.document.focusHistory.indexOf(h.controls.get('[data-table-talk-toggle]')));
  } finally { await h.voice.leave(); h.restore(); }
});

test('manual expansion persists through mic changes and room-to-match relocation', async () => {
  const h = setup();
  try {
    await connect(h);
    const toggle = h.controls.get('[data-table-talk-toggle]');
    const actions = h.controls.get('[data-table-talk-actions]');
    await toggle.click();
    assert.equal(actions.hidden, false);
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    await h.controls.get('[data-voice-action="mic"]').click();
    assert.equal(h.root.dataset.state, 'speaking');
    assert.equal(toggle.textContent, 'Hide voice controls');
    assert.equal(h.controls.get('[data-table-talk-live-status]').textContent, 'Microphone on');
    assert.equal(actions.hidden, false);
    h.voice.setInMatch(true);
    assert.equal(h.root.parentNode, h.body);
    assert.equal(actions.hidden, false);
    await toggle.click();
    assert.equal(actions.hidden, true);
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    h.voice.setInMatch(false);
    assert.equal(actions.hidden, true);
  } finally { await h.voice.leave(); h.restore(); }
});

test('playback and microphone recovery remain expanded and actionable', async () => {
  const audio = setup({ playbackBlocked: true });
  try {
    await connect(audio);
    assert.equal(audio.controls.get('[data-table-talk-actions]').hidden, false);
    assert.equal(audio.controls.get('[data-voice-action="audio"]').hidden, false);
  } finally { await audio.voice.leave(); audio.restore(); }

  const mic = setup({ microphoneDenied: true });
  try {
    await connect(mic);
    await mic.controls.get('[data-voice-action="mic"]').click();
    assert.equal(mic.controls.get('[data-table-talk-actions]').hidden, false);
    assert.equal(mic.controls.get('[data-voice-action="mic"]').textContent, 'Try microphone again');
    assert.equal(mic.controls.get('[data-table-talk-help]').hidden, false);
    assert.equal(mic.controls.get('[data-table-talk-toggle]').textContent, 'Hide voice controls');
  } finally { await mic.voice.leave(); mic.restore(); }
});

test('leaving and configuring a new room reset compact and manual expansion state', async () => {
  const h = setup();
  try {
    await connect(h);
    const toggle = h.controls.get('[data-table-talk-toggle]');
    await toggle.click();
    await h.voice.leave();
    assert.equal(h.root.dataset.compact, 'false');
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    h.voice.configure(null, false);
    h.voice.configure('room654321', true);
    assert.equal(h.controls.get('[data-table-talk-actions]').hidden, false);
  } finally { await h.voice.leave(); h.restore(); }
});
