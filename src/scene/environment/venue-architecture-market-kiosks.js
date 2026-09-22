import * as THREE from 'three';
import { block, finish, rod, roof, wire } from './venue-architecture-building-parts.js';

export function buildMarketKiosk(root, rng, wall) {
  const blue = finish('#285d7e', 0.25), timber = finish('#97734a');
  const hatch = wall.features.find(f => f.type === 'hatch');
  for (const side of [-1, 1]) {
    block(root, [0.22, hatch.h, 0.65],
      [hatch.x + side * hatch.w / 2, hatch.y + hatch.h / 2, wall.z + 0.3], blue);
    rod(root, [side * 7.5, 0, -5.5], [side * 7.5, 10.2, -5.5], 0.09, blue);
  }
  block(root, [hatch.w + 0.8, 0.24, 1.65], [hatch.x, hatch.y, wall.z + 0.7], timber);
  roof(root, rng, { x: -1, y: 10.3, z: -6.4, width: 17, depth: 3.1, color: '#9a4940' });
  const fringe = new THREE.Group();
  fringe.name = 'kiosk-awning-fringe'; fringe.position.set(-1, 10.1, -4.85);
  const colors = [finish('#ad483a'), finish('#d1af52')];
  for (let i = 0; i < 12; i++) block(fringe, [1.38, 0.48, 0.04], [-7.7 + i * 1.4, -0.24, 0], colors[i % 2]);
  root.add(fringe);
  return { update(t) { fringe.rotation.x = Math.sin(t * 0.65) * 0.035; } };
}

export function buildJamestownKiosk(root, rng, wall) {
  const teal = finish('#284747', 0.3), pale = finish('#a7bfc0', 0.4);
  const hatch = wall.features.find(f => f.type === 'hatch');
  block(root, [hatch.w + 0.8, 0.3, 1.1], [hatch.x, hatch.y, wall.z + 0.5], teal);
  roof(root, rng, { x: -2, y: 10.2, z: -6.9, width: 14, depth: 2.2, color: '#394e50' });
  wire(root, [-13, 9, -6.8], [12, 10.5, -7], 1.4, finish('#24282a'));
  for (const x of [-8.5, 4.5]) block(root, [0.18, 10, 0.35], [x, 5, wall.z + 0.2], teal);
  const tube = block(root, [3.4, 0.1, 0.12], [hatch.x, hatch.y + hatch.h - 0.2, wall.z + 0.5], pale);
  tube.material.emissive.set('#95c8d4'); tube.material.emissiveIntensity = 0.8;
  const cool = new THREE.PointLight('#99c9db', 2.5, 7, 2);
  cool.position.set(hatch.x, hatch.y + 1, wall.z + 1); root.add(cool);
  // Quay hardware stays at the edge of the kiosk yard, away from the pitch.
  for (const x of [-9.5, -7.5]) {
    rod(root, [x, 0, -5.8], [x, 1.1, -5.8], 0.18, teal);
    block(root, [0.6, 0.14, 0.35], [x, 1.1, -5.8], teal);
  }
  const rope = wire(root, [-9.5, 0.9, -5.8], [-7.5, 0.9, -5.8], 0.5, finish('#8a967c'));
  return { update(t) { rope.rotation.x = Math.sin(t * 0.45) * 0.002; } };
}
