const CUES = {
  'ruler-seesaw': 'Check the ruler. Chalk shows where it turns next.',
  'change-dish': 'Use the dish gap that is open now.',
  'clay-pot-maze': 'A goal counts only if the ball bounces off a pot or the side first.',
  'toll-gates': 'Green is open. Amber closes next turn.',
  'departing-lorry': 'Aim at the lorry now. The ghost marks its next stop.',
  'coin-stack-chain': 'Hit the stack in the beam before the locked goal.',
};

export function streetLegendRetryCue(level) {
  return level?.legend ? CUES[level.mechanic?.type] ?? null : null;
}
