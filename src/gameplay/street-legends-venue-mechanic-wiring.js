// Attaches a Street Legends venue mechanic to a match session. Classic
// campaign and 2-player levels have no `mechanic` and are untouched.
//
// Must be created BEFORE wireMatchFeedback: its 'turn' listener steps the toll
// signal first, so the AI (started by the feedback 'turn' listener) always
// plans against the booms that are actually up for its turn.
import { otherSide } from '../core/pitch-dimensions-and-constants.js';
import { TollGateLaneSignals, LANE_KEYS } from './toll-gate-lane-signal-state.js';
import { tollGateCandidatePoints, scoreTollGateOutcome } from './toll-gate-ai-lane-evaluation.js';
import { buildTollPlaza } from '../scene/toll-plaza-booths-booms-and-signals.js';

const BOOM_SOUND_STRENGTH = 0.55;

export function createVenueMechanic(session) {
  const spec = session.level.mechanic;
  if (spec?.type !== 'toll-gates') return null;
  const { physics, rules, hud, sound, level } = session;
  const gates = new TollGateLaneSignals(spec);
  gates.attach(physics);
  const view = buildTollPlaza(session.stage.group, gates);
  const tactics = level.opponent.tactics;
  const dynamicBodies = () => physics.bodies.filter((b) => b.invMass > 0);
  // Defending only matters when the other side will ever flick (not in solo acts).
  const defends = (side) => ({ defend: rules.flickLimitFor(otherSide(side)) > 0 });
  let turns = 0;

  rules.on('turn', (side) => {
    const jams = gates.advance(side, dynamicBodies());
    turns += 1;
    hud.setObjective?.(`${level.objective} · ${gates.describe(side)}`);
    sound.woodKnock?.(BOOM_SOUND_STRENGTH); // the booms clack as the signal changes
    for (const jam of jams) {
      hud.event?.(`JAMMED ${LANE_KEYS[jam.lane].toUpperCase()} BOOM`, { priority: 3, duration: 1.1 });
    }
    if (turns === 1) hud.event?.('GREEN LANES ARE OPEN', { priority: 2, duration: 1.6, detail: 'Amber closes on your next shot' });
  });
  rules.on('flick', ({ side }) => gates.beginFlick(side));

  return {
    gates,
    view,
    /** Human input waits while booms are still swinging into place. */
    get busy() { return view.animating; },
    update(dt) { view.update(dt); },
    observe(ball) { gates.observe(ball); },
    noteImpact(a, b, strength) {
      gates.noteImpact(a, b);
      const boom = a.kind === 'boom' ? a : b.kind === 'boom' ? b : null;
      if (boom) view.shake(boom.plaza, boom.lane, strength);
    },
    goalLabel(scorer) { return gates.goalLabel(scorer); },
    // AI interface used by the shot planner.
    aiCandidates(side) { return tollGateCandidatePoints(gates, side, session.ballBody.pos.y, defends(side)); },
    aiScore(sim, side, ballIndex) { return scoreTollGateOutcome(sim, side, ballIndex, gates, tactics, defends(side)); },
  };
}
