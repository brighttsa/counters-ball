import * as THREE from 'three';
import { box, rod, material } from './venue-construction-primitives.js';

export function buildVenueTableSupports(parent, profile) {
  const group = new THREE.Group();
  group.name = `support-${profile.construction}`;
  parent.add(group);
  const wood = material('#735538'), metal = material('#4b5553', 0.65);
  const top = -profile.depth;
  if (profile.construction === 'slab') {
    const blue = material('#4e7593');
    for (const x of [-1.35, 1.35]) {
      box(group, [0.30, 0.92 + top, 2.4], [x, (top - 0.92) / 2, 0], blue);
      box(group, [0.5, 0.08, 2.65], [x, -0.88, 0], blue);
    }
    rod(group, [-1.35, -0.58, 0], [1.35, -0.58, 0], 0.07, wood, true);
  } else if (profile.construction === 'counter') {
    const red = material('#943e32');
    for (const x of [-1.35, 1.35]) {
      for (const y of [-0.87, -0.59, -0.30]) {
        for (const z of [-0.85, 0.85]) box(group, [1.0, 0.07, 0.065], [x, y, z], red);
        for (const dx of [-0.47, 0.47]) box(group, [0.065, 0.07, 1.7], [x + dx, y, 0], red);
      }
      for (let i = 0; i < 5; i++) for (const z of [-0.85, 0.85]) {
        box(group, [0.055, 0.62, 0.055], [x - 0.47 + i * 0.235, -0.59, z], red);
      }
    }
  } else if (profile.construction === 'stools') {
    for (const x of [-1.3, 1.3]) {
      box(group, [0.85, 0.09, 1.95], [x, top - 0.045, 0], wood);
      for (const dx of [-0.3, 0.3]) for (const z of [-0.72, 0.72]) {
        rod(group, [x + dx, top - 0.09, z], [x + dx * 1.4, -0.92, z * 1.2], 0.065, wood, true);
      }
      for (const dx of [-0.37, 0.37]) rod(group, [x + dx, -0.65, -0.83], [x + dx, -0.65, 0.83], 0.035, wood);
    }
  } else if (profile.construction === 'trestles') {
    for (const x of [-1.35, 1.35]) {
      rod(group, [x, top, -1.15], [x, top, 1.15], 0.055, metal, true);
      for (const sign of [-1, 1]) {
        rod(group, [x, top, 0], [x, -0.9, sign * 1.2], 0.045, metal, true);
        box(group, [0.45, 0.035, 0.15], [x, -0.9, sign * 1.2], metal);
      }
      rod(group, [x, -0.65, -0.9], [x, -0.65, 0.9], 0.025, metal);
    }
    rod(group, [-1.35, -0.4, 0], [1.35, -0.4, 0], 0.045, metal);
  } else if (profile.construction === 'platform') {
    // A raised luggage stack keeps the low platform's play plane at world zero.
    const sack = material('#a79a76'), rope = material('#d6c59a');
    for (const x of [-1.25, 1.25]) box(group, [0.85, 0.67, 2.3], [x, -0.575, 0], sack);
    for (let z = -1.4; z <= 1.4; z += 0.4) box(group, [4.3, 0.16, 0.32], [0, -0.14, z], wood);
    for (const x of [-1.98, 1.98]) for (const z of [-1.38, 1.38]) {
      for (let i = 0; i < 3; i++) rod(group, [x - 0.12, -0.22, z + i * 0.018], [x + 0.12, -0.005, z + i * 0.018], 0.009, rope);
    }
  } else {
    for (const x of [-1.8, 1.8]) for (const z of [-1.2, 1.2]) {
      rod(group, [x, top, z], [x, -0.92, z], 0.045, metal, true);
      box(group, [0.15, 0.025, 0.15], [x, -0.9075, z], metal);
    }
    for (const z of [-1.2, 1.2]) box(group, [3.65, 0.22, 0.06], [0, -0.23, z], wood);
    box(group, [1.15, 0.20, 0.48], [0.35, -0.24, 1.18], wood);
    rod(group, [0.1, -0.24, 1.43], [0.6, -0.24, 1.43], 0.02, metal);
  }
}
