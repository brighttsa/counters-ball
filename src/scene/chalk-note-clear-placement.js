// Where a venue's chalk note actually goes: the venue says where it means (the toll lane that shuts next,
// the lorry's next stop, beside a stack), and this slides it along the length of the table to the nearest
// spot that no cap, ball, prop or standing edge covers. Across the table is what a note means, so it moves
// that way only when no slide along is clear, and then by at most NUDGE_Z: well under the 0.28 between two
// lorry stops or half a toll lane, so it still reads as the same stop or lane (e.g. a lorry's outer stop,
// where a kickoff cap leaves too little room between itself and the goal line).
// Pure geometry on table coordinates, so it can run every turn against where the pieces really are.

export const NOTE_SIZE = [0.54, 0.14]; // world units on the table: width along x, depth along z
const SLIDES = [0, 0.1, -0.1, 0.2, -0.2, 0.3, -0.3, 0.4, -0.4];
const NUDGES_Z = [0.04, -0.04, 0.08, -0.08, 0.12, -0.12];
export const NUDGE_Z = 0.12;
const PITCH_X = 1.47; // keep the whole note inside the goal lines (at 1.5)

/** Circles covering the table: every body, plus points along each standing segment (rulers, dish arcs, bars). */
export function tableObstacles(physics) {
  const circles = physics.bodies.filter((b) => !b.disabled).map((b) => ({ x: b.pos.x, z: b.pos.y, r: b.radius }));
  for (const s of physics.segments ?? []) {
    if (s.disabled) continue;
    for (let t = 0; t <= 1; t += 0.125) circles.push({ x: s.ax + (s.bx - s.ax) * t, z: s.az + (s.bz - s.az) * t, r: s.radius });
  }
  return circles;
}

function covered(x, z, circles) {
  const [w, h] = NOTE_SIZE;
  return circles.some((c) => Math.hypot(Math.max(Math.abs(c.x - x) - w / 2, 0), Math.max(Math.abs(c.z - z) - h / 2, 0)) < c.r);
}

function slideAlong(note, z, circles, limit) {
  for (const dx of SLIDES) {
    const x = note.x + dx;
    if (Math.abs(x) <= limit && !covered(x, z, circles)) return { ...note, x, z };
  }
  return null;
}

/**
 * The note at the nearest clear spot: along x first, then along x again with a small shift across; where it
 * asked to be (kept inside the pitch) if nowhere is clear.
 */
export function placeClear(note, circles) {
  const limit = PITCH_X - NOTE_SIZE[0] / 2;
  for (const dz of [0, ...NUDGES_Z]) {
    const placed = slideAlong(note, note.z + dz, circles, limit);
    if (placed) return placed;
  }
  return { ...note, x: Math.max(-limit, Math.min(limit, note.x)) };
}
