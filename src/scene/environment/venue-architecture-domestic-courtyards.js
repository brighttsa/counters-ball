import * as THREE from 'three';
import { block, finish, rod, roof, trestle, wire } from './venue-architecture-building-parts.js';
import { EVERYDAY_PROP_BUILDERS } from './ground-props-everyday-items.js';

export function buildSchoolCourtyard(root, rng, wall) {
  const blue = finish('#5f8fae'), plaster = finish('#e2d6b6');
  // Repeated shallow bays give the existing painted classroom actual reveals.
  for (const x of [-13.4, -7.5, -1.6, 4.5, 10.5]) {
    block(root, [0.4, 12, 0.75], [x, 6, wall.z + 0.2], plaster);
    block(root, [0.46, 2.2, 0.82], [x, 1.1, wall.z + 0.22], blue);
  }
  for (const f of wall.features.filter((f) => f.type === 'louvreWindow')) {
    block(root, [f.w + 0.5, 0.22, 0.8], [f.x, f.y, wall.z + 0.4], plaster);
    block(root, [f.w + 0.4, 0.16, 0.65], [f.x, f.y + f.h, wall.z + 0.3], plaster);
  }
  roof(root, rng, { y: 15.1, z: wall.z - 0.1, width: 31, depth: 3.6, color: '#888c89' });
  const bench = new THREE.Group(); bench.name = 'school-bench-and-book';
  bench.position.set(-6.4, 0, -4.9); bench.rotation.y = -0.16;
  const timber = finish('#9c8057');
  trestle(bench, 0, 0, 4.3, 1.9, blue);
  for (const z of [-0.38, 0, 0.38]) block(bench, [5.4, 0.16, 0.34], [0, 1.98, z], timber);
  for (const x of [-2.15, 2.15]) rod(bench, [x, 0.6, -0.55], [x, 3.2, -0.7], 0.065, blue);
  block(bench, [5.4, 0.55, 0.12], [0, 2.85, -0.66], timber);
  const book = EVERYDAY_PROP_BUILDERS.exerciseBook(rng);
  book.position.set(0.6, 2.07, 0); book.rotation.y = 0.12; bench.add(book);
  root.add(bench);
  return { foreground: [bench], update() {} };
}

export function buildDomesticVeranda(root, rng, wall) {
  const green = finish('#42745a'), red = finish('#873f30'), cream = finish('#c9baa1');
  // The step remains behind the table: neither the play plane nor its support moves.
  block(root, [26, 0.3, 0.65], [0, 0.15, -5.4], red);
  block(root, [26, 0.08, 0.22], [0, 0.34, -5.12], cream);
  for (const x of [-10.8, -5.8, 5.8, 11.2]) {
    block(root, [0.62, 0.45, 0.62], [x, 0.225, -5.8], cream);
    block(root, [0.3, 11.8, 0.3], [x, 6.3, -5.8], green);
    block(root, [0.6, 0.25, 0.6], [x, 12.1, -5.8], cream);
    rod(root, [x, 10.4, -5.8], [x + (x < 0 ? 1 : -1), 12.2, -5.8], 0.06, green);
  }
  block(root, [25, 0.32, 0.36], [0, 12.35, -5.8], green);
  roof(root, rng, { y: 12.9, z: -7.5, width: 26, depth: 4.2, color: '#796c5c' });
  const line = finish('#574e40');
  wire(root, [6, 8.5, -6.3], [11, 8.5, wall.z + 0.3], 0.3, line);
  const washing = [];
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group(); pivot.position.set(7 + i * 1.4, 8.36, -6.4 - i * 0.16);
    const geometry = new THREE.PlaneGeometry(1.05, 1.8 + rng() * 0.5, 6, 8);
    geometry.translate(0, -geometry.parameters.height / 2, 0);
    const p = geometry.attributes.position;
    for (let j = 0; j < p.count; j++) p.setZ(j, Math.sin(p.getX(j) * 14) * 0.055);
    geometry.computeVertexNormals();
    const material = finish(['#ccd0bc', '#659098', '#a66351'][i]); material.side = THREE.DoubleSide;
    const cloth = new THREE.Mesh(geometry, material); cloth.castShadow = true;
    pivot.add(cloth); root.add(pivot); washing.push({ pivot, phase: rng() * Math.PI * 2 });
  }
  return { update(t) { for (const { pivot, phase } of washing) pivot.rotation.x = Math.sin(t * 0.7 + phase) * 0.035; } };
}
