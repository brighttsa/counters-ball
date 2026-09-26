// Schoolyard Break (Adabraka Primary): rulers that turn between turns.
// State lives in ruler-seesaw-state.js, AI reading in
// ruler-seesaw-ai-evaluation.js and the set piece in the scene module.
import { RulerSeesaws } from './ruler-seesaw-state.js';
import { rulerCandidatePoints, scoreRulerOutcome } from './ruler-seesaw-ai-evaluation.js';
import { buildRulerSeesaws } from '../scene/ruler-seesaw-and-chalk-telegraph.js';

export function createRulerSeesawMechanic(session) {
  const rulers = new RulerSeesaws(session.level.mechanic);
  rulers.attach(session.physics);
  const view = buildRulerSeesaws(session.stage.group, rulers);
  const tactics = session.level.opponent.tactics;
  return {
    rulers,
    view,
    hint: { label: 'BOUNCE OFF THE RULER', detail: 'The chalk shows where it turns next' },
    onTurn: (side, bodies) => rulers.advance(side, bodies),
    describe: (side) => rulers.describe(side),
    onFlick: (side) => rulers.beginFlick(side),
    noteImpact(a, b, strength) {
      rulers.noteImpact(a, b);
      const ruler = a.kind === 'ruler' ? a : b.kind === 'ruler' ? b : null;
      if (ruler) view.shake(ruler.ruler, strength);
    },
    goalLabel: (scorer) => rulers.goalLabel(scorer),
    aiCandidates: (side) => rulerCandidatePoints(rulers, side),
    aiScore: (sim, side, ballIndex, options) => scoreRulerOutcome(sim, side, ballIndex, rulers, tactics, options),
  };
}
