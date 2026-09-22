// Auntie Ama's veranda set piece at bottle-cap scale: small terracotta pots of
// snake plant on the table, each circled in chalk so the bank surfaces read
// from across the table on a phone. Static between turns; a pot rocks when the
// ball knocks it. Pots share materials and leaf geometry; each pot stays its
// own group so it can rock when hit.
import * as THREE from 'three';
import { material } from './venue-construction-primitives.js';
import { POT_RADIUS } from '../gameplay/clay-pot-maze-state.js';

const POT_HEIGHT = 0.11;

function potProfile() {
  const r = POT_RADIUS;
  return [[0, 0], [r * 0.72, 0], [r * 0.8, 0.01], [r * 0.95, POT_HEIGHT * 0.8], [r * 1.06, POT_HEIGHT * 0.84],
    [r * 1.06, POT_HEIGHT], [r * 0.94, POT_HEIGHT], [r * 0.9, POT_HEIGHT * 0.9]].map(([x, y]) => new THREE.Vector2(x, y));
}

function buildPot(mats, seed) {
  const pot = new THREE.Group();
  const body = new THREE.Mesh(new THREE.LatheGeometry(potProfile(), 20), mats.clay);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(POT_RADIUS * 0.9, 16), mats.soil);
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = POT_HEIGHT * 0.9;
  pot.add(body, soil);
  // Snake-plant leaves: tall, pointed, banded green with yellow edges (shared geometry).
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(mats.leafGeometry, mats.leaf);
    const a = seed * 1.7 + i * 1.26;
    leaf.position.set(Math.cos(a) * POT_RADIUS * 0.35, POT_HEIGHT * 0.9 + 0.06, Math.sin(a) * POT_RADIUS * 0.35);
    leaf.rotation.set(Math.sin(a) * 0.25, a, Math.cos(a) * 0.25);
    leaf.scale.y = 0.8 + ((i * 37 + seed * 11) % 7) / 14;
    pot.add(leaf);
  }
  pot.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return pot;
}

export function buildClayPotMaze(parent, potBodies) {
  const root = new THREE.Group();
  root.name = 'kumasi-clay-pot-maze';
  const mats = {
    clay: material('#b5552f', 0, 0.9), soil: material('#3a2616', 0, 1), leaf: material('#4d7a3a', 0, 0.7),
    leafGeometry: new THREE.ConeGeometry(0.012, 0.13, 4),
    chalk: new THREE.MeshBasicMaterial({ color: 0xf4f1e8, transparent: true, opacity: 0.6, depthWrite: false }),
  };
  const rigs = potBodies.map((body, i) => {
    const pot = buildPot(mats, i + 1);
    pot.position.set(body.pos.x, 0.002, body.pos.y);
    const ring = new THREE.Mesh(new THREE.RingGeometry(POT_RADIUS + 0.035, POT_RADIUS + 0.048, 28), mats.chalk);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(body.pos.x, 0.003, body.pos.y);
    root.add(pot, ring);
    return { body, pot, rock: 0 };
  });
  parent.add(root);
  let time = 0;

  return {
    root,
    animating: false, // the maze never moves between turns
    wobble(body, strength) {
      const rig = rigs.find((r) => r.body === body);
      if (rig) rig.rock = Math.min(0.2, rig.rock + strength * 0.25);
    },
    update(dt) {
      time += dt;
      for (const rig of rigs) {
        rig.rock *= Math.exp(-dt * 6);
        rig.pot.rotation.z = Math.sin(time * 28) * rig.rock;
      }
    },
  };
}
