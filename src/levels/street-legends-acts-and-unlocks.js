// The Street Legends track: every built venue's acts in circuit order, and the
// unlock rule. Each venue's Act 1 is always open (pick any built venue);
// later acts open once the previous act of the same venue has been won.
import { SCHOOLYARD_RULER_SEESAW_ACTS } from './street-legends-schoolyard-ruler-seesaw-acts.js?v=2';
import { KIOSK_CHANGE_DISH_ACTS } from './street-legends-kiosk-change-dish-acts.js?v=2';
import { VERANDA_CLAY_POT_ACTS } from './street-legends-veranda-clay-pot-acts.js?v=2';
import { ROADSIDE_TOLL_GATE_ACTS } from './street-legends-roadside-toll-gate-acts.js?v=2';
import { HARMATTAN_DEPARTING_LORRY_ACTS } from './street-legends-harmattan-departing-lorry-acts.js?v=2';
import { LIGHTS_OUT_COIN_STACK_ACTS } from './street-legends-lights-out-coin-stack-acts.js?v=2';

export const STREET_LEGENDS_ACTS = [...SCHOOLYARD_RULER_SEESAW_ACTS, ...KIOSK_CHANGE_DISH_ACTS, ...VERANDA_CLAY_POT_ACTS,
  ...ROADSIDE_TOLL_GATE_ACTS, ...HARMATTAN_DEPARTING_LORRY_ACTS, ...LIGHTS_OUT_COIN_STACK_ACTS];

export function isLegendActUnlocked(progress, acts, index) {
  const level = acts[index];
  if (!level || level.legend.act === 1) return Boolean(level);
  return (progress.stars[acts[index - 1].id] ?? 0) >= 1;
}
