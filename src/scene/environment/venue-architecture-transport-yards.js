import * as THREE from 'three';
import { block, finish, rod, roof } from './venue-architecture-building-parts.js';

function vehicle(color, cargo = false) {
  const root = new THREE.Group(), paint = finish(color, 0.25), dark = finish('#343a39');
  block(root, [6.8, 1.7, 2.1], [0, 1.55, 0], paint);
  block(root, [cargo ? 2 : 5.5, 1.5, 2], [cargo ? 2 : 0, 3.05, 0], paint);
  block(root, [cargo ? 1.5 : 4.9, 0.85, 0.04], [cargo ? 2 : 0, 3.15, 1.03], dark);
  for (const x of [-2.2, 2.2]) for (const z of [-1.05, 1.05]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.28, 12), dark);
    wheel.rotation.x = Math.PI / 2; wheel.position.set(x, 0.65, z); root.add(wheel);
  }
  if (cargo) {
    block(root, [4.3, 2, 2.05], [-1.15, 3, 0], finish('#7d8771'));
    for (const x of [-2.8, -1.2, 0.5]) rod(root, [x, 2, 1.08], [x, 4.05, 1.08], 0.035, dark);
  }
  return root;
}

export function buildRoadsideChopBar(root, rng, wall) {
  const steel = finish('#625c53', 0.6);
  roof(root, rng, { x: 7.5, y: 12.4, z: wall.z, width: 13, depth: 2.5, color: '#875d47' });
  for (const x of [2, 13]) rod(root, [x, 0, wall.z + 1], [x, 12.4, wall.z + 1], 0.075, steel);
  // The lane lies between the gutter and the recessed chop bar.
  block(root, [48, 0.04, 5], [0, 0.01, -9.5], finish('#454540'));
  const van = vehicle('#637d7c'); van.name = 'distant-roadside-van';
  van.position.set(-18, 0, -9.5); root.add(van);
  return { update(t) { van.position.x = -26 + (t * 1.1 + 8) % 52; } };
}

export function buildLorryStation(root, rng, wall) {
  const timber = finish('#867359'), iron = finish('#726c61', 0.35);
  roof(root, rng, { x: -6, y: 12.2, z: -6.9, width: 16, depth: 2.6, color: '#aaa18a' });
  for (const x of [-13, 1]) rod(root, [x, 0, -5.9], [x, 12.2, -5.9], 0.09, timber);
  const board = wall.features.find(f => f.type === 'board');
  for (const side of [-1, 1]) block(root, [0.18, board.h + 0.3, 0.35],
    [board.x + side * board.w / 2, board.y + board.h / 2, wall.z + 0.2], timber);
  for (const [x, z, color] of [[-9, -8.8, '#8f927c'], [10, -8.8, '#a08b68']]) {
    const lorry = vehicle(color, true); lorry.name = 'station-parked-lorry';
    lorry.position.set(x, 0, z); lorry.rotation.y = x < 0 ? 0.18 : -0.2; root.add(lorry);
  }
  const flap = new THREE.Group(); flap.name = 'station-canopy-flap';
  flap.position.set(-6, 11.9, -5.6);
  block(flap, [13.5, 0.65, 0.035], [0, -0.325, 0], iron); root.add(flap);
  return { update(t) { flap.rotation.x = (Math.sin(t * 0.55) + Math.sin(t * 1.3) * 0.3) * 0.025; } };
}
