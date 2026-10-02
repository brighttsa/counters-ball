import test from 'node:test';
import assert from 'node:assert/strict';
import { createTableTalkControls } from '../src/ui/table-talk-controls.js';

class Control {
  constructor() { this.hidden = false; this.disabled = false; this.textContent = ''; this.dataset = {}; this.listeners = {}; }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  querySelector() { return new Control(); }
}

class Container {
  insertBefore(node) { node.parentNode = this; }
}

test('private-room voice setup is discoverable, optional and starts with microphone off', () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const root = new Control();
  const roomCard = new Container();
  const body = new Container();
  body.append = node => { node.parentNode = body; };
  root.parentNode = roomCard;
  const controls = new Map([
    ['[data-voice-action="join"]', new Control()],
    ['[data-voice-action="mic"]', new Control()],
    ['[data-voice-action="leave"]', new Control()],
    ['[data-table-talk-status]', new Control()],
    ['[data-table-talk-help]', new Control()],
    ['[data-table-talk-audio]', new Control()],
  ]);
  const setup = new Control(); setup.hidden = true;
  const setupJoin = new Control();
  globalThis.document = {
    body,
    getElementById: id => id === 'table-talk-room-setup' ? setup : setupJoin,
    addEventListener() {},
  };
  globalThis.window = { addEventListener() {} };

  try {
    root.querySelector = selector => controls.get(selector);
    const voice = createTableTalkControls(root, 'https://konk.world/m', null);
    voice.configure('private-room', true);
    assert.equal(root.hidden, false);
    assert.equal(setup.hidden, false);
    assert.equal(setupJoin.hidden, false);
    assert.equal(controls.get('[data-voice-action="mic"]').hidden, true);
    voice.setInMatch(true);
    assert.equal(root.parentNode, body);
    assert.equal(root.dataset.inMatch, 'true');
    voice.setInMatch(false);
    assert.equal(root.parentNode, roomCard);
    assert.equal(root.dataset.inMatch, 'false');
    voice.configure(null, false);
    assert.equal(root.hidden, true);
    assert.equal(setup.hidden, true);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});
