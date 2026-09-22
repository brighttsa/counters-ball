import * as THREE from 'three';
import { GOAL_LINE_X, GOAL_HALF_WIDTH as GW } from '../core/pitch-dimensions-and-constants.js';
import { createSeededRandom } from '../core/seeded-random-number-generator.js';
import { box, rod, material } from './venue-construction-primitives.js';

function lash(group, z, rope, height) {
  for (let i = 0; i < 4; i++) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.004, 4, 10), rope);
    loop.position.set(0, height - 0.035 + i * 0.011, z);
    loop.rotation.x = Math.PI / 2;
    group.add(loop);
  }
}

export function buildVenueGoals(parent, profile, seed = 7802) {
  const rng = createSeededRandom(seed);
  const type = profile.goal, wire = type === 'wire', pvc = type === 'pvc';
  const square = type === 'painted' || type === 'steel';
  const radius = wire ? 0.009 : type === 'twigs' ? 0.014 : 0.019;
  const height = wire ? 0.28 : type === 'twigs' ? 0.225 : 0.25;
  const mat = material(pvc ? '#e1decb' : type === 'painted' ? '#d7dcca'
    : wire ? '#858d85' : type === 'steel' ? '#795342' : '#ac8856', wire || type === 'steel' ? 0.65 : 0, pvc ? 0.42 : 0.82);
  const rope = material('#cdb78a'), scar = material(type === 'painted' ? '#517c99' : '#493d30');
  const goals = {}, postBodies = [];
  for (const side of [-1, 1]) {
    const goal = new THREE.Group();
    goal.name = `goal-${type}`;
    goal.position.x = side * GOAL_LINE_X;
    parent.add(goal); goals[side] = goal;
    for (const z of [-GW, GW]) {
      rod(goal, [0, 0, z], [0, height, z], radius, mat, square);
      postBodies.push({ x: side * GOAL_LINE_X, z, radius: 0.02, kind: 'post' });
      if (type === 'lashed' || type === 'twigs') lash(goal, z, rope, height);
      if (type === 'twigs') rod(goal, [0, height * 0.62, z], [side * 0.045, height * 0.85, z + Math.sign(z) * 0.035], 0.006, mat);
      if (type === 'painted') box(goal, [0.04, 0.028, 0.04], [0, 0.035, z], scar);
      if (pvc) {
        rod(goal, [0, height - 0.025, z], [0, height + 0.01, z], 0.024, mat);
        rod(goal, [0, height, z], [side * 0.23, 0.02, z], 0.009, mat);
      }
      if (wire || type === 'steel') {
        rod(goal, [0, height, z], [side * 0.21, 0.012, z], radius * 0.65, mat, square);
        rod(goal, [0, 0.012, z], [side * 0.21, 0.012, z], radius * 0.65, mat, square);
      }
      for (let i = 0; i < 4; i++) {
        box(goal, [radius * 0.5, 0.008 + rng() * 0.012, radius * 0.4],
          [-radius, 0.04 + rng() * (height - 0.06), z + radius * 0.3], scar);
      }
    }
    rod(goal, [0, height, -GW - radius], [0, height, GW + radius], radius, mat, square);
    if (pvc) {
      const net = material('#b9b5a2');
      for (let z = -GW; z <= GW + 0.001; z += GW / 4) rod(goal, [0.012 * side, height, z], [side * 0.23, 0.012, z], 0.002, net);
      for (let i = 1; i <= 4; i++) {
        const t = i / 4;
        rod(goal, [side * 0.23 * t, height * (1 - t) + 0.012 * t, -GW],
          [side * 0.23 * t, height * (1 - t) + 0.012 * t, GW], 0.002, net);
      }
    }
  }
  return { goals, postBodies };
}
