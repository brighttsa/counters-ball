// In-match chalk hints that teach at the moment they help, once ever each, instead of a tutorial up front:
//  · bank   — the straight line to goal is blocked but a one-rail bank is clean: a chalk line shows it.
//  · street — the flick being aimed will run into a prop: suggests the low Street view.
//  · peek   — one of your caps is hidden behind another piece from this camera: the Tactical peek button glows.
// Hints only appear on a human player's own turn while aiming, never over replays, goal cameras or the
// attract loop, and leave as soon as the flick is played. Which ones have been seen is kept on the device.
import * as THREE from 'three';
import { findRailBank, hiddenFromCamera } from '../gameplay/chalk-hint-shot-geometry.js';

export const CHALK_HINTS_KEY = 'counters-ball-chalk-hints-v1';
const HINT_SECONDS = 9;
const fine = () => globalThis.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches ?? false;
const COPY = {
  bank: () => 'Blocked? Bounce it off the side',
  street: () => (fine() ? 'In the way? Street view · 3' : 'In the way? Camera → Street Level'),
  peek: () => 'Cap hidden? Hold Tactical peek',
};

export class JustInTimeChalkHints {
  constructor({ storage = globalThis.localStorage, root = document.body } = {}) {
    this.storage = storage;
    try { this.seen = new Set(JSON.parse(storage?.getItem(CHALK_HINTS_KEY)) ?? []); } catch { this.seen = new Set(); }
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('chalk-hint-path');
    this.svg.setAttribute('aria-hidden', 'true');
    this.line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    this.svg.append(this.line);
    this.label = document.createElement('p');
    this.label.className = 'chalk-hint-label';
    this.label.setAttribute('role', 'status');
    root.append(this.svg, this.label);
    this.active = null;
    this.turn = null;
    this.hide();
  }

  /** "Show tips again": every hint can appear once more. */
  reset() {
    this.seen.clear();
    try { this.storage?.removeItem(CHALK_HINTS_KEY); } catch { /* storage is optional */ }
  }

  remember(id) {
    this.seen.add(id);
    try { this.storage?.setItem(CHALK_HINTS_KEY, JSON.stringify([...this.seen])); } catch { /* storage is optional */ }
  }

  start(id, data) {
    this.remember(id);
    this.active = { id, data, age: 0 };
    this.label.textContent = COPY[id]();
    this.label.dataset.hint = id;
    this.label.hidden = false;
    this.svg.style.display = id === 'bank' ? '' : 'none'; // SVG elements ignore the hidden property
    document.getElementById('camera-peek')?.classList.toggle('chalk-hint-glow', id === 'peek');
  }

  hide() {
    this.active = null;
    this.label.hidden = true;
    this.svg.style.display = 'none';
    document.getElementById('camera-peek')?.classList.remove('chalk-hint-glow');
  }

  /** Called every frame after the camera has moved. */
  update(session, camera, control, dt = 0) {
    const side = session?.rules.turn;
    // Kwame's Corner teaches the same things itself, so the one-time hints stay out of the practice table.
    const playing = session && !session.options.isAttract && !session.options.isPreview && !session.level.practice && control?.active
      && !session.paused && !session.tutorialActive && session.rules.phase === 'aiming' && session.rules.isHuman(side);
    if (!playing) { if (this.active) this.hide(); this.turn = null; return; }
    // A new turn for a human player: look for the turn-start hints once.
    const turn = `${side}:${session.rules.flicksUsed.home + session.rules.flicksUsed.away}`;
    if (turn !== this.turn) {
      this.turn = turn;
      if (this.active) this.hide();
      if (!this.seen.has('bank')) {
        const bank = findRailBank(session.physics, session.ballBody.pos, side);
        if (bank) this.start('bank', bank);
      }
      if (!this.active && !this.seen.has('peek') && control.mode !== 'tactical') {
        const own = session.entries.filter(e => e.side === side);
        if (own.some(e => hiddenFromCamera(camera.position, e.body, session.physics))) this.start('peek');
      }
    }
    // While aiming: the flick's first contact is a fixed prop (a pot, a booth, a coin stack).
    const contact = session.visuals.preview?.contact;
    if (!this.active && !this.seen.has('street') && control.mode !== 'street' && session.input.selected
      && contact?.target && contact.target.invMass === 0 && contact.target.kind !== 'post') {
      this.start('street', { point: contact.position });
    }
    if (!this.active) return;
    this.active.age += dt;
    if (this.active.age > HINT_SECONDS) { this.hide(); return; }
    this.place(camera);
  }

  // Screen position of a table point (x, y = world z).
  screen(camera, point, height = .02) {
    const p = new THREE.Vector3(point.x, height, point.y).project(camera);
    return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight };
  }

  place(camera) {
    const { id, data } = this.active;
    let anchor;
    if (id === 'bank') {
      const points = [data.ball, data.bank, data.goal].map(point => this.screen(camera, point));
      this.line.setAttribute('points', points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
      anchor = points[1];
    } else if (id === 'street') {
      anchor = this.screen(camera, data.point, .1);
    } else {
      const button = document.getElementById('camera-peek')?.getBoundingClientRect();
      anchor = button ? { x: button.left + button.width / 2, y: button.top - 8 } : { x: innerWidth / 2, y: innerHeight - 90 };
    }
    // Keep the label on screen and above its anchor.
    const width = this.label.offsetWidth, height = this.label.offsetHeight;
    const x = Math.min(innerWidth - width - 12, Math.max(12, anchor.x - width / 2));
    const y = Math.min(innerHeight - height - 12, Math.max(12, anchor.y - height - 14));
    this.label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }

  dispose() { this.hide(); this.svg.remove(); this.label.remove(); }
}
