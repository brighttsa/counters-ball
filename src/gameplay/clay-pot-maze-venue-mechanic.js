// Veranda Derby (Auntie Ama's Veranda, Kumasi): the clay-pot maze and her
// bank-only rule. State lives in clay-pot-maze-state.js, AI reading in
// clay-pot-maze-ai-evaluation.js and the set piece in the scene module.
import { ClayPotMaze } from './clay-pot-maze-state.js';
import { potCandidatePoints, scorePotOutcome } from './clay-pot-maze-ai-evaluation.js';
import { buildClayPotMaze } from '../scene/veranda-clay-pot-maze.js';

export function createClayPotMazeMechanic(session) {
  const maze = new ClayPotMaze();
  maze.attach(session.physics);
  const view = buildClayPotMaze(session.stage.group, maze.pots);
  const tactics = session.level.opponent.tactics;
  // A straight goal is waved off: say so plainly, and let the ball roll on.
  session.physics.onGoalDenied = () => {
    maze.denied += 1;
    session.hud.event?.('BOUNCE IT IN', { priority: 5, duration: 1.4, detail: 'Auntie Ama\'s rule: off a pot or the side first' });
    session.sound.woodKnock?.(0.7);
  };
  return {
    maze,
    view,
    hint: { label: 'BOUNCE FIRST', detail: 'Bounce it off a pot or the side first' },
    onTurn: (side, bodies) => maze.advance(side, bodies),
    describe: () => maze.describe(),
    onFlick: (side) => maze.beginFlick(side),
    noteImpact(a, b, strength) {
      maze.noteImpact(a, b);
      const pot = a.kind === 'pot' ? a : b.kind === 'pot' ? b : null;
      if (pot) view.wobble(pot, strength);
    },
    goalLabel: (scorer) => maze.goalLabel(scorer),
    aiCandidates: (side) => potCandidatePoints(maze, side, session.ballBody.pos),
    aiScore: (sim, side, ballIndex, options) => scorePotOutcome(sim, side, ballIndex, maze, tactics, options),
  };
}
