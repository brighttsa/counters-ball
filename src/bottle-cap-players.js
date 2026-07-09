// Two teams of flattened metal bottle caps: scalloped crown rims, worn team
// paint, printed emblem fragments, scratches, rust specks and fingerprints.
import * as THREE from 'three';
import { createSeededRandom } from './seeded-random-number-generator.js';
import {
  CAP_RADIUS, CAP_HEIGHT, TEAM_FORMATION, TEAM_RED, TEAM_GREEN,
} from './pitch-dimensions-and-constants.js';

const TEAM_STYLE = {
  [TEAM_RED]: { paint: '#a83b2a', paintDark: '#6f2318', emblem: 'star' },
  [TEAM_GREEN]: { paint: '#2c6e4b', paintDark: '#1a4a30', emblem: 'ring' },
};

function paintCapTopTexture(team, capSeed) {
  const rng = createSeededRandom(capSeed);
  const s = TEAM_STYLE[team];
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const R = 128;

  // Faded enamel paint with a darker rim ring, like a real crown cap top.
  const g = ctx.createRadialGradient(R - 26, R - 30, 20, R, R, R);
  g.addColorStop(0, s.paint);
  g.addColorStop(0.72, s.paint);
  g.addColorStop(0.88, s.paintDark);
  g.addColorStop(1, '#4a4a4a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  // Printed emblem fragment, half worn away.
  ctx.save();
  ctx.translate(R, R);
  ctx.rotate((rng() - 0.5) * 1.2);
  ctx.globalAlpha = 0.55 + rng() * 0.3;
  ctx.fillStyle = team === TEAM_RED ? '#efe4cd' : '#dfb94f';
  if (s.emblem === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
      ctx.lineTo(Math.cos(a) * 58, Math.sin(a) * 58);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.lineWidth = 16;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0.3, Math.PI * 1.75);
    ctx.stroke();
    ctx.font = 'bold 44px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('11', 0, 16);
  }
  ctx.restore();

  // Paint chips down to bare metal near the rim.
  for (let i = 0; i < 9; i++) {
    const a = rng() * Math.PI * 2, d = 92 + rng() * 30;
    ctx.fillStyle = `rgba(188, 188, 190, ${0.6 + rng() * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(R + Math.cos(a) * d, R + Math.sin(a) * d,
      3 + rng() * 9, 2 + rng() * 5, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // Rust specks, scratches, fingerprint smudge.
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(122, 59, 30, ${0.25 + rng() * 0.4})`;
    ctx.beginPath();
    ctx.arc(rng() * 256, rng() * 256, 0.8 + rng() * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 22; i++) {
    const x = rng() * 256, y = rng() * 256, a = rng() * Math.PI;
    const len = 14 + rng() * 60;
    ctx.strokeStyle = rng() > 0.5
      ? `rgba(235, 235, 235, ${0.1 + rng() * 0.22})`
      : `rgba(30, 20, 12, ${0.1 + rng() * 0.2})`;
    ctx.lineWidth = 0.7 + rng() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = '#ffffff';
  for (let i = 0; i < 12; i++) { // fingerprint ridge arcs
    ctx.beginPath();
    ctx.arc(150 + rng() * 20, 96 + rng() * 20, 12 + i * 3.2, rng() * 2, rng() * 2 + 2.2);
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Cylinder with a scalloped, flared skirt — a crown cap hammered flat.
function createFlattenedCapGeometry(rng) {
  const geo = new THREE.CylinderGeometry(CAP_RADIUS * 0.94, CAP_RADIUS, CAP_HEIGHT, 44, 3);
  const pos = geo.attributes.position;
  const flutes = 21;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-5) continue;
    const angle = Math.atan2(z, x);
    const bottomness = THREE.MathUtils.clamp(0.5 - y / CAP_HEIGHT, 0, 1);
    const scallop = 1 + 0.06 * Math.sin(angle * flutes) * bottomness;
    const dent = 1 + (rng() - 0.5) * 0.015; // hand-flattened irregularity
    pos.setX(i, (x / r) * r * scallop * dent);
    pos.setZ(i, (z / r) * r * scallop * dent);
  }
  geo.computeVertexNormals();
  return geo;
}

export function buildBottleCapTeams(scene) {
  const rng = createSeededRandom(9917);
  const sideMat = new THREE.MeshStandardMaterial({
    color: 0xc9c9cc, metalness: 0.85, roughness: 0.38,
  });
  const caps = [];
  for (const [team, dir] of [[TEAM_RED, 1], [TEAM_GREEN, -1]]) {
    TEAM_FORMATION.forEach(([fx, fz], i) => {
      const topMat = new THREE.MeshStandardMaterial({
        map: paintCapTopTexture(team, 1000 * dir + i * 37),
        metalness: 0.55, roughness: 0.5,
      });
      const mesh = new THREE.Mesh(createFlattenedCapGeometry(rng),
        [sideMat, topMat, sideMat.clone()]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.rotation.y = rng() * Math.PI * 2;
      mesh.rotation.z = (rng() - 0.5) * 0.03; // sits slightly unevenly
      const scale = 0.96 + rng() * 0.08;      // no two caps are the same size
      mesh.scale.setScalar(scale);
      mesh.position.set(fx * dir, (CAP_HEIGHT / 2) * scale, fz);
      scene.add(mesh);
      caps.push({ mesh, team, home: [fx * dir, fz], radius: CAP_RADIUS * scale });
    });
  }
  return caps;
}
