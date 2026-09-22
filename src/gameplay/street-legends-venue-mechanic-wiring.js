// Attaches a Street Legends venue mechanic to a match session. Classic
// campaign and 2-player levels have no `mechanic` and are untouched.
//
// Each mechanic type registers a factory returning a small definition:
//   { view: { animating, update(dt) }, onTurn(side, bodies) → callout labels,
//     describe(side), hint: { label, detail }, onFlick?(side), observe?(ball),
//     noteImpact?(a, b, strength), goalLabel(scorer),
//     aiCandidates(side, ballZ, { defend }), aiScore(sim, side, ballIndex, { defend }) }
// Everything shared (turn wiring, HUD line, input lock, solo detection) lives here.
//
// Must be created BEFORE wireMatchFeedback: its 'turn' listener steps the venue
// first, so the AI (started by the feedback 'turn' listener) always plans
// against the table as it actually is for its turn.
import { otherSide } from '../core/pitch-dimensions-and-constants.js';
import { createTollGateMechanic } from './toll-gate-venue-mechanic.js';
import { createDepartingLorryMechanic } from './departing-lorry-venue-mechanic.js';
import { createRulerSeesawMechanic } from './ruler-seesaw-venue-mechanic.js';
import { createChangeDishMechanic } from './change-dish-venue-mechanic.js';
import { createClayPotMazeMechanic } from './clay-pot-maze-venue-mechanic.js';
import { createCoinStackChainMechanic } from './coin-stack-chain-venue-mechanic.js';

const FACTORIES = {
  'toll-gates': createTollGateMechanic,
  'departing-lorry': createDepartingLorryMechanic,
  'ruler-seesaw': createRulerSeesawMechanic,
  'change-dish': createChangeDishMechanic,
  'clay-pot-maze': createClayPotMazeMechanic,
  'coin-stack-chain': createCoinStackChainMechanic,
};
const SIGNAL_SOUND_STRENGTH = 0.55;

export function createVenueMechanic(session) {
  const factory = FACTORIES[session.level.mechanic?.type];
  if (!factory) return null;
  const { physics, rules, hud, sound, level } = session;
  const m = factory(session);
  const dynamicBodies = () => physics.bodies.filter((b) => b.invMass > 0);
  // Defending only matters when the other side will ever flick (not in solo acts).
  const defends = (side) => ({ defend: rules.flickLimitFor(otherSide(side)) > 0 });
  let turns = 0;

  rules.on('turn', (side) => {
    const callouts = m.onTurn(side, dynamicBodies());
    turns += 1;
    hud.setObjective?.(`${level.objective} · ${m.describe(side)}`);
    sound.woodKnock?.(SIGNAL_SOUND_STRENGTH); // booms clack / tailboards knock as the venue changes
    for (const label of callouts) hud.event?.(label, { priority: 3, duration: 1.1 });
    if (turns === 1) hud.event?.(m.hint.label, { priority: 2, duration: 1.6, detail: m.hint.detail });
  });
  rules.on('flick', ({ side }) => m.onFlick?.(side));

  return {
    definition: m,
    /** Human input waits while the venue is still moving into place. */
    get busy() { return m.view.animating; },
    update(dt) { m.view.update(dt); },
    observe(ball) { m.observe?.(ball); },
    noteImpact(a, b, strength) { m.noteImpact?.(a, b, strength); },
    goalLabel(scorer) { return m.goalLabel(scorer); },
    // AI interface used by the shot planner.
    aiCandidates(side) { return m.aiCandidates(side, session.ballBody.pos.y, defends(side)); },
    aiScore(sim, side, ballIndex) { return m.aiScore(sim, side, ballIndex, defends(side)); },
  };
}
