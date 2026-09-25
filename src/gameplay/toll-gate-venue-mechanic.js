// Roadside Showdown (Tema Motorway Junction): toll plazas as a venue mechanic.
// State lives in toll-gate-lane-signal-state.js, AI reading in
// toll-gate-ai-lane-evaluation.js and the set piece in the scene module.
import { TollGateLaneSignals, LANE_KEYS } from './toll-gate-lane-signal-state.js';
import { tollGateCandidatePoints, scoreTollGateOutcome } from './toll-gate-ai-lane-evaluation.js';
import { buildTollPlaza } from '../scene/toll-plaza-booths-booms-and-signals.js';

export function createTollGateMechanic(session) {
  const gates = new TollGateLaneSignals(session.level.mechanic);
  gates.attach(session.physics);
  const view = buildTollPlaza(session.stage.group, gates);
  const tactics = session.level.opponent.tactics;
  return {
    gates,
    view,
    hint: { label: 'GREEN LANES ARE OPEN', detail: 'Amber closes on your next shot' },
    onTurn: (side, bodies) => gates.advance(side, bodies)
      .map((jam) => `JAMMED ${LANE_KEYS[jam.lane].toUpperCase()} BOOM`),
    describe: (side) => gates.describe(side),
    onFlick: (side) => gates.beginFlick(side),
    observe: (ball) => gates.observe(ball),
    noteImpact(a, b, strength) {
      gates.noteImpact(a, b);
      const boom = a.kind === 'boom' ? a : b.kind === 'boom' ? b : null;
      if (boom) view.shake(boom.plaza, boom.lane, strength);
    },
    goalLabel: (scorer) => gates.goalLabel(scorer),
    aiCandidates: (side, ballZ, options) => tollGateCandidatePoints(gates, side, ballZ, options),
    aiScore: (sim, side, ballIndex, options) => scoreTollGateOutcome(sim, side, ballIndex, gates, tactics, options),
  };
}
