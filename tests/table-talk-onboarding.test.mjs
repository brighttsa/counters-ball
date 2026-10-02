import test from 'node:test';
import assert from 'node:assert/strict';
import { createTableTalkControls } from '../src/ui/table-talk-controls.js';

class Control {
  constructor(documentObject) {
    this.document = documentObject; this._hidden = false; this._disabled = false;
    this.textContent = ''; this.dataset = {}; this.attributes = {}; this.listeners = {};
  }
  get hidden() { return this._hidden; }
  set hidden(value) { this._hidden = value; if (value && [this, this.child].includes(this.document.activeElement)) this.document.activeElement = null; }
  get disabled() { return this._disabled; }
  set disabled(value) { this._disabled = value; if (value && this.document.activeElement === this) this.document.activeElement = null; }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  focus() { if (!this.hidden && !this.disabled) { this.document.activeElement = this; this.document.focusHistory.push(this); } }
  click() { return this.listeners.click?.({ currentTarget: this }); }
}

class Container {
  constructor() { this.children = []; }
  append(node) { node.parentNode = this; this.children.push(node); }
  insertBefore(node) { node.parentNode = this; this.children.push(node); }
}

function setup({ playbackBlocked = false, microphoneDenied = false } = {}) {
  const previous = { document: globalThis.document, window: globalThis.window, fetch: globalThis.fetch, sdk: globalThis.LivekitClient };
  const documentObject = { activeElement: null, focusHistory: [], hidden: false, addEventListener() {} };
  const controls = new Map();
  const root = new Control(documentObject); root.parentNode = new Container();
  const body = new Container();
  const selectors = [
    '[data-voice-action="join"]', '[data-voice-action="audio"]', '[data-voice-action="mic"]',
    '[data-voice-action="leave"]', '[data-table-talk-status]', '[data-table-talk-help]',
    '[data-table-talk-audio]', '[data-table-talk-toggle]', '[data-table-talk-actions]', '[data-table-talk-live-status]',
  ];
  selectors.forEach(selector => controls.set(selector, new Control(documentObject)));
  root.querySelector = selector => controls.get(selector);
  const setupPanel = new Control(documentObject); setupPanel.hidden = true;
  const setupJoin = new Control(documentObject);
  setupPanel.child = setupJoin;
  documentObject.body = body;
  documentObject.getElementById = id => id === 'table-talk-room-setup' ? setupPanel : setupJoin;
  globalThis.document = documentObject;
  globalThis.window = { addEventListener() {} };
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ url: 'wss://voice.example', token: 'token', sessionId: 'session' }) });

  const events = new Map(); let captures = 0;
  const room = {
    localParticipant: { publishTrack: async () => {}, unpublishTrack: async () => {} },
    on: (event, callback) => events.set(event, callback),
    connect: async () => {}, startAudio: playbackBlocked ? async () => { throw new Error('gesture required'); } : async () => {},
    disconnect: async () => {},
  };
  globalThis.LivekitClient = {
    Room: class { constructor() { return room; } },
    RoomEvent: { TrackSubscribed: 'subscribed', TrackUnsubscribed: 'unsubscribed', ActiveSpeakersChanged: 'speakers' },
    Track: { Kind: { Audio: 'audio' }, Source: { Microphone: 'microphone' } },
    createLocalAudioTrack: async () => { captures++; if (microphoneDenied) throw new Error('denied'); return { stop() {} }; },
  };
  const voice = createTableTalkControls(root, 'https://konk.world/m', null);
  return {
    root, body, controls, setupPanel, setupJoin, document: documentObject, voice, captures: () => captures,
    restore() {
      globalThis.document = previous.document; globalThis.window = previous.window;
      globalThis.fetch = previous.fetch; globalThis.LivekitClient = previous.sdk;
    },
  };
}

async function connect(h, fromRoomSetup = false) {
  h.voice.configure('room123456', true);
  const join = fromRoomSetup ? h.setupJoin : h.controls.get('[data-voice-action="join"]');
  join.focus();
  await join.click();
}

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
