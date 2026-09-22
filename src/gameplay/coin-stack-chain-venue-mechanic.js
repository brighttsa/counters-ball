// Lights Out Final (Jamestown, under the kiosk bulb): Magic's coin-stack chain
// and padlocked goals. State lives in coin-stack-chain-state.js, AI reading in
// coin-stack-chain-ai-evaluation.js and the set piece in the scene module.
import { CoinStackChains } from './coin-stack-chain-state.js';
import { chainCandidatePoints, scoreChainOutcome } from './coin-stack-chain-ai-evaluation.js';
import { buildCoinStackChains } from '../scene/jamestown-coin-stack-chain-and-padlock.js';

export function createCoinStackChainMechanic(session) {
  const chains = new CoinStackChains();
  chains.attach(session.physics);
  const view = buildCoinStackChains(session.stage.group, chains);
  const { opponent } = session.level;
  const rivalName = opponent.kid.match(/"([^"]+)"/)?.[1] ?? opponent.kid; // Kofi "Magic" → Magic on the HUD
  // The scorer's bulb goes out: their chain relights from stack one after kickoff.
  session.rules.on('goal', ({ scorer }) => chains.goalScored(scorer));
  return {
    chains,
    view,
    hint: { label: 'STRIKE THE STACK IN THE BEAM', detail: 'Ball or your own cap · light all three to open the padlock' },
    onTurn: () => chains.advance(),
    describe: (side) => chains.describe(side, rivalName),
    onFlick: (side) => chains.beginFlick(side),
    noteImpact(a, b) {
      for (const label of chains.noteImpact(a, b)) {
        const lightsOn = label === 'LIGHTS ON';
        session.hud.event?.(label, { priority: lightsOn ? 5 : 4, duration: lightsOn ? 1.6 : 1.1,
          detail: lightsOn ? 'The padlock is off: that goal is open' : 'The beam moves on' });
        session.sound.starDing?.(lightsOn ? 2 : 0);
        if (lightsOn) session.post?.pulseBloom?.(0.4);
      }
    },
    goalLabel: (scorer) => chains.goalLabel(scorer),
    aiCandidates: (side) => chainCandidatePoints(chains, side),
    aiScore: (sim, side, ballIndex, options) => scoreChainOutcome(sim, side, ballIndex, chains, opponent.tactics, options),
  };
}
