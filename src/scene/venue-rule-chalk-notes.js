// A Street Legends venue's rule, chalked on the table next to the prop it is about: "NEXT: ACROSS" beside a
// ruler, "SHUTS NEXT" on the toll lane that closes next, "LORRY NEXT" at the lorry's next stop. Where a
// note sits carries half the meaning, so the words stay short and no note says "left" or "right" (which
// flips with the camera). Each note lies flat on the pitch, turned to read upright on screen, and fades in
// when its words change. Venues supply notes as plain data:
//   { x, z, text, side? }  (side tints the chalk in that team's colour, e.g. whose coin chain it is)
// and each is slid along the table to the nearest spot no piece or prop covers.
import * as THREE from 'three';
import { chalkSurface, chalkify, chalkTint, CHALK_WHITE } from './chalk-table-score-and-flick-tallies.js';
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
    // Turned so the words' top points the way the screen's top does, laid on the table: upright from a
    // low side view and from straight above alike (turning toward the camera's position fails overhead).
    mesh.onBeforeRender = (renderer, scene, camera) => {
      const e = camera.matrixWorld.elements; // column 1 is the camera's up in world space
      if (Math.hypot(e[4], e[6]) > 1e-4) mesh.rotation.y = Math.atan2(-e[4], -e[6]);
      mesh.updateMatrixWorld();
    };
    root.add(mesh);
    return { ...surface, key: '', note: null };
  });
  parent.add(root);

  const draw = (slot) => {
    const { text, side } = slot.note;
    drawNote(slot.ctx, text, tint[side] ?? CHALK_WHITE);
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
        const key = note ? `${note.text}|${note.side ?? ''}|${note.x.toFixed(3)}|${note.z.toFixed(3)}` : '';
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
