// Street Legends table cues sit beside the prop they explain. They are symbols
// first (arrows, warning bars, pips), with text only as a fallback/debug aid.
import * as THREE from 'three';
import { chalkSurface, chalkify, chalkTint, screenUprightYaw, CHALK_WHITE } from './chalk-table-score-and-flick-tallies.js';
import { NOTE_SIZE, placeClear } from './chalk-note-clear-placement.js';

const MAX_NOTES = 4;
const OPACITY = 0.95;
const FADE_RATE = 5; // per second

function drawNote(ctx, text, colour) {
  const { width, height } = ctx.canvas;
  chalkify(ctx, (c) => {
    const fontFor = (size) => `700 ${size}px 'Cabin Sketch', 'Chalkboard SE', cursive`;
    c.font = fontFor(height * 0.78);
    c.font = fontFor(height * 0.78 * Math.min(1, (width * 0.94) / c.measureText(text).width)); // never overflow
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    // A faint dark edge under the chalk, so pale chalk still reads on sun-bleached concrete and cardboard.
    c.lineJoin = 'round';
    c.lineWidth = height * 0.13;
    c.strokeStyle = 'rgba(40, 28, 16, 0.62)';
    c.strokeText(text, width / 2, height * 0.54);
    c.fillStyle = colour;
    c.fillText(text, width / 2, height * 0.54);
  });
}

function drawIcon(ctx, note, colour) {
  const { width: w, height: h } = ctx.canvas;
  chalkify(ctx, (c) => {
    c.strokeStyle = colour;
    c.fillStyle = colour;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = h * 0.11;
    const cx = w / 2, cy = h / 2;
    if (note.icon === 'bank-curve') {
      c.beginPath(); c.arc(cx, cy * 1.05, h * 0.34, Math.PI * 0.95, Math.PI * 1.95); c.stroke();
      c.beginPath(); c.moveTo(cx + h * 0.32, cy * 0.82); c.lineTo(cx + h * 0.16, cy * 0.62); c.lineTo(cx + h * 0.42, cy * 0.57); c.stroke();
      return;
    }
    if (note.icon === 'boom-warning') {
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(cx - h * 0.32, cy + i * h * 0.22); c.lineTo(cx + h * 0.32, cy + i * h * 0.22); c.stroke(); }
      return;
    }
    if (note.icon === 'dish-gap') {
      c.beginPath(); c.arc(cx, cy, h * 0.35, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
      c.beginPath(); c.arc(cx, cy, h * 0.35, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
      return;
    }
    if (note.icon === 'lorry-stop') {
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(cx + i * h * 0.22, cy, h * 0.06, 0, Math.PI * 2); c.fill(); }
      c.beginPath(); c.moveTo(cx - h * 0.42, cy + h * 0.26); c.lineTo(cx + h * 0.42, cy + h * 0.26); c.stroke();
      return;
    }
    if (note.icon === 'ruler-angle') {
      const a = (Number(note.value) || 0) * Math.PI / 4;
      c.beginPath(); c.moveTo(cx - Math.cos(a) * h * 0.42, cy + Math.sin(a) * h * 0.42);
      c.lineTo(cx + Math.cos(a) * h * 0.42, cy - Math.sin(a) * h * 0.42); c.stroke();
      return;
    }
    if (note.icon === 'coin-chain' || note.icon === 'goal-open') {
      const lit = note.icon === 'goal-open' ? 3 : Number(note.value) || 0;
      for (let i = 0; i < 3; i++) {
        c.globalAlpha = i < lit ? 1 : 0.34;
        c.beginPath(); c.arc(cx + (i - 1) * h * 0.25, cy, h * 0.1, 0, Math.PI * 2); c.stroke();
      }
      c.globalAlpha = 1;
      if (note.icon === 'goal-open') { c.beginPath(); c.moveTo(cx - h * 0.34, cy + h * 0.25); c.lineTo(cx + h * 0.34, cy - h * 0.25); c.stroke(); }
    }
  });
}

/** @param colours { home, away } team hud colours, for notes that belong to one side */
export function createVenueRuleChalkNotes(parent, colours = {}) {
  const root = new THREE.Group();
  root.name = 'venue-rule-chalk-notes';
  const tint = { home: colours.home ? chalkTint(colours.home) : CHALK_WHITE, away: colours.away ? chalkTint(colours.away) : CHALK_WHITE };
  const slots = Array.from({ length: MAX_NOTES }, () => {
    const surface = chalkSurface(...NOTE_SIZE, 512, 133); // canvas matches the note's shape
    const { mesh } = surface;
    mesh.visible = false;
    mesh.material.opacity = 0;
    mesh.onBeforeRender = (renderer, scene, camera) => {
      mesh.rotation.y = screenUprightYaw(camera) ?? mesh.rotation.y;
      mesh.updateMatrixWorld();
    };
    root.add(mesh);
    return { ...surface, key: '', note: null };
  });
  parent.add(root);

  const draw = (slot) => {
    const { text, side } = slot.note;
    if (slot.note.icon) drawIcon(slot.ctx, slot.note, tint[side] ?? CHALK_WHITE);
    else drawNote(slot.ctx, text, tint[side] ?? CHALK_WHITE);
    slot.texture.needsUpdate = true;
  };
  // Canvas text falls back to a system font until the chalk face loads; redraw once it has.
  Promise.resolve(document.fonts?.load?.("700 64px 'Cabin Sketch'"))
    .then(() => slots.forEach((slot) => slot.note && draw(slot))).catch(() => {});

  return {
    root,
    /**
     * Replace the notes on the table, each slid clear of `obstacles` (see chalk-note-clear-placement);
     * unchanged notes stay put, changed ones fade back in.
     */
    set(notes = [], obstacles = []) {
      slots.forEach((slot, i) => {
        const note = notes[i] ? placeClear(notes[i], obstacles) : null;
        const key = note ? `${note.icon ?? note.text}|${note.value ?? ''}|${note.side ?? ''}|${note.x.toFixed(3)}|${note.z.toFixed(3)}` : '';
        if (key === slot.key) return;
        slot.key = key;
        slot.note = note;
        slot.mesh.visible = Boolean(note);
        if (!note) return;
        slot.mesh.position.set(note.x, 0.005, note.z);
        slot.mesh.material.opacity = 0;
        draw(slot);
      });
    },
    update(dt) {
      for (const slot of slots) {
        if (!slot.mesh.visible) continue;
        const m = slot.mesh.material;
        m.opacity += (OPACITY - m.opacity) * (1 - Math.exp(-dt * FADE_RATE));
      }
    },
    /** The notes currently on the table (for tests and debugging). */
    get notes() { return slots.filter((s) => s.note).map((s) => s.note); },
  };
}
