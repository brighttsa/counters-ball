// Things that end up on a real street table: pebbles, a soft-drink bottle
// (its cap long since recruited as a player) and a stack of pesewa coins.
// Each is a static circle for physics and a small handmade-looking mesh.
import * as THREE from 'three';
import { createSeededRandom } from '../core/seeded-random-number-generator.js';

export const OBSTACLE_RADIUS = { pebble: 0.06, bottle: 0.075, coins: 0.052 };

function buildPebble(rng) {
  const r = OBSTACLE_RADIUS.pebble;
  const geo = new THREE.IcosahedronGeometry(r, 1);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).multiplyScalar(0.84 + rng() * 0.3);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const tone = 0.34 + rng() * 0.16;
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.08, 0.18, tone), roughness: 0.92, flatShading: true,
  }));
  mesh.scale.set(1, 0.55, 1);
  mesh.position.y = r * 0.42;
  mesh.rotation.y = rng() * Math.PI * 2;
  return mesh;
}

function buildBottle() {
  const bottle = new THREE.Group();
  const profile = [
    [0.0, 0.0], [0.066, 0.0], [0.072, 0.012], [0.072, 0.23], [0.058, 0.29],
    [0.026, 0.34], [0.021, 0.39], [0.025, 0.4], [0.02, 0.41],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(profile, 28), new THREE.MeshStandardMaterial({
    color: 0x2f6b3a, transparent: true, opacity: 0.62, roughness: 0.08, metalness: 0.15,
  }));
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0735, 0.0735, 0.075, 28, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9, side: THREE.DoubleSide })
  );
  label.position.y = 0.13;
  bottle.add(glass, label);
  return bottle;
}

function buildCoinStack(rng) {
  const stack = new THREE.Group();
  const coinGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.007, 28);
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a65a, metalness: 0.9, roughness: 0.35 });
  const nickel = new THREE.MeshStandardMaterial({ color: 0xb9b8b0, metalness: 0.9, roughness: 0.3 });
  const count = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    const coin = new THREE.Mesh(coinGeo, i % 2 ? nickel : brass);
    coin.position.set((rng() - 0.5) * 0.008, 0.0035 + i * 0.0072, (rng() - 0.5) * 0.008);
    stack.add(coin);
  }
  return stack;
}

const BUILDERS = { pebble: buildPebble, bottle: buildBottle, coins: buildCoinStack };

/** @returns static circle bodies [{ x, z, radius, kind }] */
export function buildTableObstacles(group, obstacles, seed = 5150) {
  const rng = createSeededRandom(seed);
  return obstacles.map(({ type, x, z }) => {
    const mesh = BUILDERS[type](rng);
    mesh.position.x = x;
    mesh.position.z = z;
    mesh.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(mesh);
    return { x, z, radius: OBSTACLE_RADIUS[type], kind: type };
  });
}
