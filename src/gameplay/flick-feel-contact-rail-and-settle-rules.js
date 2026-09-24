// How a flick feels, as three small rules on top of plain sliding-disc physics. Each rule hangs on its
// own constants: set CONTACT_RESTITUTION_SQUARE and _GLANCE both to 0.72, RAIL_RESTITUTION to 0.55,
// RAIL_GRIP to 1 and SETTLE_FRICTION to 0 and the table behaves exactly as it did before them.
// The computer rehearses its shots on a clone of the same engine, so its planning follows these rules too.

// Clean contact: a square, centred hit passes on more of its speed than a glancing one, so a well-lined-up
// strike visibly pops the ball and a thin cut drifts off softer.
export const CONTACT_RESTITUTION_SQUARE = 0.8;
export const CONTACT_RESTITUTION_GLANCE = 0.6;

// Rail bite: the batten bounces a piece back livelier (restitution) and grips it along its length (grip,
// the share of along-rail speed kept). Kept nearly equal, a piece leaves the rail at close to the angle it
// came in, so a bank off the rail follows the mirror line a player (and the chalk bank hint) would draw.
// Before: 0.55 back and no grip, which flattened every bank by 15° or more and made them miss.
export const RAIL_RESTITUTION = 0.72;
export const RAIL_GRIP = 0.8;

// Quick settle: below SETTLE_SPEED (table units per second) a piece rattles to a stop under extra dusty
// friction instead of creeping, so the turn hands over sooner. Scaled by the venue's friction like the rest.
export const SETTLE_SPEED = 0.12;
export const SETTLE_FRICTION = 0.6;

/** Restitution for a body-body hit from the approach speed along the contact normal and the total closing speed. */
export function contactRestitution(normalSpeed, closingSpeed) {
  const square = closingSpeed > 0 ? Math.min(1, normalSpeed / closingSpeed) : 1;
  return CONTACT_RESTITUTION_GLANCE + (CONTACT_RESTITUTION_SQUARE - CONTACT_RESTITUTION_GLANCE) * square * square;
}

/** Extra low-speed friction (per second², on top of the body's own) that ends the slow creep. */
export function settleFriction(speed, frictionScale = 1) {
  return speed < SETTLE_SPEED ? SETTLE_FRICTION * frictionScale : 0;
}
