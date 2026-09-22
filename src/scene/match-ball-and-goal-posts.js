// The match ball — a crumpled paper wad, small and unpredictable — and the
// improvised goals: matchstick posts with burnt heads and a matchstick crossbar.
import * as THREE from 'three';
import { buildVenueGoals } from './venue-goal-construction.js';
import { createSeededRandom } from '../core/seeded-random-number-generator.js';
import { BALL_RADIUS, GOAL_LINE_X, GOAL_HALF_WIDTH } from '../core/pitch-dimensions-and-constants.js';

function paintPaperBallTexture(rng) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e6dcc8';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { // crease shadows
    const x = rng() * 256, y = rng() * 256;
    ctx.strokeStyle = `rgba(110, 92, 64, ${0.12 + rng() * 0.25})`;
    ctx.lineWidth = 0.8 + rng() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (rng() - 0.5) * 60, y + (rng() - 0.5) * 60,
      x + (rng() - 0.5) * 100, y + (rng() - 0.5) * 100);
    ctx.stroke();
  }
  for (let i = 0; i < 24; i++) { // grime and thumb smudges
    const x = rng() * 256, y = rng() * 256, r = 6 + rng() * 20;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(96, 74, 46, 0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildPaperMatchBall(group) {
  const rng = createSeededRandom(4451);
  const geo = new THREE.IcosahedronGeometry(BALL_RADIUS, 2);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { // seed-like irregular lumps
    v.fromBufferAttribute(pos, i).multiplyScalar(1 + (rng() - 0.5) * 0.16);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: paintPaperBallTexture(rng), roughness: 0.92, metalness: 0,
  }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(0, BALL_RADIUS, 0);
  group.add(mesh);
  return mesh;
}

/** @returns {{ postBodies, goals: Record<-1|1, THREE.Group> }} goal groups pivot at the ground for wobble */
export function buildMatchstickGoals(group, profile, seed) {
  if (profile) return buildVenueGoals(group, profile, seed);
  const rng = createSeededRandom(7802);
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xd6b581, roughness: 0.8 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0x53261a, roughness: 0.6 });
  const postGeo = new THREE.CylinderGeometry(0.016, 0.019, 0.24, 8);
  const headGeo = new THREE.SphereGeometry(0.024, 10, 8);
  const barGeo = new THREE.CylinderGeometry(0.014, 0.014, GOAL_HALF_WIDTH * 2 + 0.05, 8);

  const postBodies = []; // static circles so the ball can rattle off the woodwork
  const goals = {};
  for (const side of [-1, 1]) {
    const goal = new THREE.Group();
    for (const zs of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(0, 0.12, zs * GOAL_HALF_WIDTH);
      post.rotation.set((rng() - 0.5) * 0.1, 0, (rng() - 0.5) * 0.1); // hand-planted lean
      post.castShadow = true;
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 0.12;
      post.add(head);
      goal.add(post);
      postBodies.push({ x: side * GOAL_LINE_X, z: zs * GOAL_HALF_WIDTH, radius: 0.02, kind: 'post' });
    }
    const bar = new THREE.Mesh(barGeo, woodMat);
    bar.rotation.set(Math.PI / 2, 0, (rng() - 0.5) * 0.06);
    bar.position.y = 0.235;
    bar.castShadow = true;
    goal.add(bar);
    goal.position.set(side * GOAL_LINE_X, 0, 0);
    group.add(goal);
    goals[side] = goal;
  }
  return { postBodies, goals };
}
