// The Street Legends track: every built venue's acts in circuit order, and the
// unlock rule. Each venue's Act 1 is always open (pick any built venue);
// later acts open once the previous act of the same venue has been won.
import { ROADSIDE_TOLL_GATE_ACTS } from './street-legends-roadside-toll-gate-acts.js';
import { HARMATTAN_DEPARTING_LORRY_ACTS } from './street-legends-harmattan-departing-lorry-acts.js';

export const STREET_LEGENDS_ACTS = [...ROADSIDE_TOLL_GATE_ACTS, ...HARMATTAN_DEPARTING_LORRY_ACTS];

export function isLegendActUnlocked(progress, acts, index) {
  const level = acts[index];
  if (!level || level.legend.act === 1) return Boolean(level);
  return (progress.stars[acts[index - 1].id] ?? 0) >= 1;
}
