import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, connect } from './helpers/table-talk-controller-harness.mjs';

test('compact mic shortcut requests capture immediately and never on connection', async () => {
  const h = setup();
  try {
    await connect(h);
    const shortcut = h.controls.get('[data-table-talk-mic-shortcut]');
    assert.equal(shortcut.hidden, false);
    assert.equal(shortcut.textContent, 'Turn mic on');
    assert.equal(h.captures(), 0);
    const request = shortcut.click();
    assert.equal(h.captures(), 1);
    await request;
    assert.equal(h.root.dataset.state, 'speaking');
    await h.controls.get('[data-table-talk-toggle]').click();
    assert.equal(shortcut.textContent, 'Mute mic');
    await shortcut.click();
    assert.equal(h.root.dataset.state, 'listening');
    assert.equal(h.captures(), 1);
  } finally { await h.voice.leave(); h.restore(); }
});

test('unanswered microphone request remains cancelable and cannot publish a late track', async () => {
  let resolve, stopped = 0;
  const h = setup({ capture: () => new Promise(yes => { resolve = yes; }) });
  try {
    await connect(h);
    const pending = h.controls.get('[data-table-talk-mic-shortcut]').click();
    const mic = h.controls.get('[data-voice-action="mic"]');
    assert.equal(h.root.dataset.state, 'requesting-microphone');
    assert.equal(mic.disabled, false);
    assert.equal(mic.textContent, 'Cancel mic request');
    assert.match(h.controls.get('[data-table-talk-help]').textContent, /No prompt/);
    await mic.click(); await pending;
    assert.equal(h.root.dataset.state, 'listening');
    resolve({ stop() { stopped++; } });
    await new Promise(yes => setImmediate(yes));
    assert.equal(stopped, 1); assert.equal(h.published.length, 0);
  } finally { await h.voice.leave(); h.restore(); }
});

test('denied access explains site settings without pretending another tap forces a prompt', async () => {
  const h = setup({ microphoneDenied: true });
  try {
    await connect(h);
    await h.controls.get('[data-table-talk-mic-shortcut]').click();
    assert.equal(h.root.dataset.state, 'listening');
    assert.match(h.controls.get('[data-table-talk-status]').textContent, /access is blocked/);
    assert.match(h.controls.get('[data-table-talk-help]').textContent, /website settings/);
    assert.match(h.controls.get('[data-table-talk-help]').textContent, /Reload this tab/);
    assert.equal(h.published.length, 0);
  } finally { await h.voice.leave(); h.restore(); }
});
