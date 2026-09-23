const CUES = {
  'ruler-seesaw': 'Check the ruler now; the chalk previews its next angle.',
  'change-dish': 'Shoot through the dish gap that is open now.',
  'clay-pot-maze': 'The ball must touch a pot or rail on the scoring flick.',
  'toll-gates': 'Choose a green lane; amber closes on your next turn.',
  'departing-lorry': 'Shoot at the lorry now; the ghost goal marks its next stop.',
  'coin-stack-chain': 'Light the stack in the beam before aiming at the lock.',
};

export function streetLegendRetryCue(level) {
  return level?.legend ? CUES[level.mechanic?.type] ?? null : null;
}
