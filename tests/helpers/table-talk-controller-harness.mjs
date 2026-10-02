import { createTableTalkControls } from '../../src/ui/table-talk-controls.js';

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

export function setup({ playbackBlocked = false, microphoneDenied = false, capture, startAudio } = {}) {
  const previous = { document: globalThis.document, window: globalThis.window, fetch: globalThis.fetch,
    sdk: globalThis.LivekitClient, navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator') };
  const documentObject = { activeElement: null, focusHistory: [], hidden: false, addEventListener() {} };
  const controls = new Map();
  const root = new Control(documentObject); root.parentNode = new Container();
  const body = new Container();
  const selectors = [
    '[data-voice-action="join"]', '[data-voice-action="audio"]', '[data-voice-action="mic"]',
    '[data-voice-action="leave"]', '[data-table-talk-status]', '[data-table-talk-help]',
    '[data-table-talk-audio]', '[data-table-talk-toggle]', '[data-table-talk-actions]',
    '[data-table-talk-live-status]', '[data-table-talk-mic-shortcut]',
  ];
  selectors.forEach(selector => controls.set(selector, new Control(documentObject)));
  root.querySelector = selector => controls.get(selector);
  const setupPanel = new Control(documentObject); setupPanel.hidden = true;
  const setupJoin = new Control(documentObject); setupPanel.child = setupJoin;
  documentObject.body = body;
  documentObject.getElementById = id => id === 'table-talk-room-setup' ? setupPanel : setupJoin;
  globalThis.document = documentObject;
  globalThis.window = { addEventListener() {} };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia() {} } } });
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ url: 'wss://voice.example', token: 'token', sessionId: 'session' }) });

  const events = new Map(), published = []; let captures = 0;
  const room = {
    localParticipant: { publishTrack: async track => { published.push(track); }, unpublishTrack: async () => {} },
    on: (event, callback) => events.set(event, callback),
    connect: async () => {}, startAudio: startAudio ?? (playbackBlocked ? async () => { throw new Error('gesture required'); } : async () => {}),
    disconnect: async () => {},
  };
  globalThis.LivekitClient = {
    Room: class { constructor() { return room; } },
    RoomEvent: { TrackSubscribed: 'subscribed', TrackUnsubscribed: 'unsubscribed', ActiveSpeakersChanged: 'speakers', AudioPlaybackStatusChanged: 'playback' },
    Track: { Kind: { Audio: 'audio' }, Source: { Microphone: 'microphone' } },
    createLocalAudioTrack: () => {
      captures++;
      if (capture) return capture();
      if (microphoneDenied) return Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
      return Promise.resolve({ stop() {} });
    },
  };
  const voice = createTableTalkControls(root, 'https://konk.world/m', null);
  return {
    root, body, controls, setupPanel, setupJoin, document: documentObject, voice, captures: () => captures, published, events,
    restore() {
      globalThis.document = previous.document; globalThis.window = previous.window;
      globalThis.fetch = previous.fetch; globalThis.LivekitClient = previous.sdk;
      if (previous.navigator) Object.defineProperty(globalThis, 'navigator', previous.navigator);
      else delete globalThis.navigator;
    },
  };
}

export async function connect(h, fromRoomSetup = false) {
  h.voice.configure('room123456', true);
  const join = fromRoomSetup ? h.setupJoin : h.controls.get('[data-voice-action="join"]');
  join.focus(); await join.click();
}
