// Kiosk Corner (Nima Market Road): enamel change dishes guarding the goals.
// State lives in change-dish-state.js, AI reading in change-dish-ai-evaluation.js
// and the set piece in the scene module.
import { ChangeDishes } from './change-dish-state.js';
import { dishCandidatePoints, scoreDishOutcome } from './change-dish-ai-evaluation.js';
import { buildChangeDishes } from '../scene/change-dish-enamel-tray-and-chalk.js';

export function createChangeDishMechanic(session) {
  const dishes = new ChangeDishes(session.level.mechanic);
  dishes.attach(session.physics);
  const view = buildChangeDishes(session.stage.group, dishes);
  const tactics = session.level.opponent.tactics;
  return {
    dishes,
    view,
    hint: { label: 'FIND THE GAP IN THE DISH', detail: 'Chalk shows where it covers next' },
    onTurn: (side, bodies) => dishes.advance(side, bodies),
    describe: (side) => dishes.describe(side),
    onFlick: (side) => dishes.beginFlick(side),
    noteImpact(a, b, strength) {
      dishes.noteImpact(a, b);
      const piece = a.kind === 'dish' ? a : b.kind === 'dish' ? b : null;
      if (piece) view.rattle(piece.dish, strength);
    },
    goalLabel: (scorer) => dishes.goalLabel(scorer),
    aiCandidates: (side) => dishCandidatePoints(dishes, side),
    aiScore: (sim, side, ballIndex, options) => scoreDishOutcome(sim, side, ballIndex, dishes, tactics, options),
  };
}
