// Harmattan Haze (Tamale Lorry Station): goals on departing lorries.
// State lives in departing-lorry-goal-state.js, AI reading in
// departing-lorry-ai-evaluation.js and the set piece in the scene module.
import { DepartingLorryGoals } from './departing-lorry-goal-state.js';
import { lorryCandidatePoints, scoreLorryOutcome } from './departing-lorry-ai-evaluation.js';
import { buildDepartingLorries } from '../scene/departing-lorry-track-and-toy-lorries.js';

export function createDepartingLorryMechanic(session) {
  const lorries = new DepartingLorryGoals(session.level.mechanic);
  lorries.attach(session.physics);
  const view = buildDepartingLorries(session.stage.group, session.stage.goals, lorries);
  const tactics = session.level.opponent.tactics;
  return {
    lorries,
    view,
    hint: { label: 'CATCH THE LORRY', detail: 'The ghost goal shows its next stop' },
    onTurn: (side) => lorries.advance(side),
    describe: (side) => lorries.describe(side),
    onFlick: (side) => lorries.beginFlick(side),
    goalLabel: (scorer) => lorries.goalLabel(scorer),
    aiCandidates: (side, _ballZ, options) => lorryCandidatePoints(lorries, side, options),
    aiScore: (sim, side, ballIndex, options) => scoreLorryOutcome(sim, side, ballIndex, lorries, tactics, options),
  };
}
