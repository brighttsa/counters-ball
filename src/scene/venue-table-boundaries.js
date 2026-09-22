import * as THREE from 'three';
import { WALL_HALF_LENGTH as WL, WALL_HALF_WIDTH as WW } from '../core/pitch-dimensions-and-constants.js';
import { box, rod, material } from './venue-construction-primitives.js';

export function buildVenueTableBoundaries(parent, profile) {
  const group = new THREE.Group();
  group.name = `boundary-${profile.construction}`;
  parent.add(group);
  const steel = ['trestles', 'desk'].includes(profile.construction);
  const mat = material(profile.edge, steel ? 0.6 : 0, 0.72);
  const hardware = material('#74685a', 0.6);
  const thickness = profile.construction === 'counter' ? 0.07 : 0.045;
  const height = profile.construction === 'platform' ? 0.035 : 0.05;
  for (const side of [-1, 1]) {
    // Flat inner faces coincide exactly with physics; all extra trim faces outward.
    box(group, [WL * 2 + thickness * 2, height, thickness], [0, height / 2, side * (WW + thickness / 2)], mat);
    box(group, [thickness, height, WW * 2], [side * (WL + thickness / 2), height / 2, 0], mat);
    if (profile.construction === 'stools') {
      rod(group, [-WL, height, side * (WW + thickness)], [WL, height, side * (WW + thickness)], 0.022, mat);
      rod(group, [side * (WL + thickness), height, -WW], [side * (WL + thickness), height, WW], 0.022, mat);
    } else if (steel || profile.construction === 'counter') {
      box(group, [WL * 2 + 0.16, 0.016, 0.10], [0, 0.008, side * (WW + thickness + 0.05)], mat);
      box(group, [0.10, 0.016, WW * 2], [side * (WL + thickness + 0.05), 0.008, 0], mat);
      if (profile.construction === 'trestles') for (const x of [-0.9, 0.5]) {
        box(group, [0.19, 0.065, 0.02], [x, 0.0325, side * (WW + thickness + 0.01)], hardware);
      }
    } else if (profile.construction === 'platform') {
      for (const x of [-1.58, 1.58]) for (let i = 0; i < 3; i++) {
        rod(group, [x + i * 0.018, 0.044, side * (WW + 0.005)],
          [x + i * 0.018, 0.044, side * (WW + 0.085)], 0.006, hardware);
      }
    } else {
      for (const x of [-1.3, -0.5, 0.6, 1.3]) box(group, [0.08, 0.003, 0.025], [x, height + 0.0015, side * (WW + thickness / 2)], hardware);
    }
  }
}
