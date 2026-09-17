// Two teams of flattened crown caps: scalloped rims, worn team enamel,
// printed emblem fragments, scratches, rust specks and fingerprints.
// Each cap is a pivot (position, lean, squash) holding a spinning mesh.
import * as THREE from 'three';
import { createSeededRandom } from '../core/seeded-random-number-generator.js';
import {
  CAP_RADIUS, CAP_HEIGHT, TEAM_FORMATION, SIDE_HOME, SIDE_AWAY,
} from '../core/pitch-dimensions-and-constants.js';

function drawEmblem(ctx, palette, rng) {
  ctx.save();
  ctx.translate(128, 128);
  ctx.rotate((rng() - 0.5) * 1.2);
  ctx.globalAlpha = 0.55 + rng() * 0.3;
  ctx.fillStyle = ctx.strokeStyle = palette.emblemColor;
  switch (palette.emblem) {
    case 'star':
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
        ctx.lineTo(Math.cos(a) * 58, Math.sin(a) * 58);
      }
      ctx.closePath();
      ctx.fill();
      break;
    case 'stripes':
      ctx.beginPath();
      ctx.arc(0, 0, 92, 0, Math.PI * 2);
      ctx.clip();
      ctx.rotate(0.7);
      ctx.fillRect(-120, -34, 240, 22);
      ctx.fillRect(-120, 12, 240, 22);
      break;
    case 'dot':
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(0, 0, 58, 0, Math.PI * 2);
      ctx.stroke();
      break;
    default: // ring + shirt number
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0.3, Math.PI * 1.75);
      ctx.stroke();
      ctx.font = 'bold 44px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('11', 0, 16);
  }
  ctx.restore();
}

function paintCapTopTexture(palette, capSeed) {
  const rng = createSeededRandom(capSeed);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');

  const g = ctx.createRadialGradient(102, 98, 20, 128, 128, 128);
  g.addColorStop(0, palette.paint);
  g.addColorStop(0.72, palette.paint);
  g.addColorStop(0.88, palette.paintDark);
  g.addColorStop(1, '#4a4a4a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  drawEmblem(ctx, palette, rng);

  for (let i = 0; i < 9; i++) { // paint chips down to bare metal
    const a = rng() * Math.PI * 2, d = 92 + rng() * 30;
    ctx.fillStyle = `rgba(188, 188, 190, ${0.6 + rng() * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 3 + rng() * 9, 2 + rng() * 5, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 26; i++) { // rust specks
    ctx.fillStyle = `rgba(122, 59, 30, ${0.25 + rng() * 0.4})`;
    ctx.beginPath();
    ctx.arc(rng() * 256, rng() * 256, 0.8 + rng() * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 22; i++) { // scratches
    const x = rng() * 256, y = rng() * 256, a = rng() * Math.PI, len = 14 + rng() * 60;
    ctx.strokeStyle = rng() > 0.5 ? `rgba(235,235,235,${0.1 + rng() * 0.22})` : `rgba(30,20,12,${0.1 + rng() * 0.2})`;
    ctx.lineWidth = 0.7 + rng() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 12; i++) { // fingerprint ridges
    ctx.beginPath();
    ctx.arc(150 + rng() * 20, 96 + rng() * 20, 12 + i * 3.2, rng() * 2, rng() * 2 + 2.2);
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
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (Math.hypot(x, z) < 1e-5) continue;
    const bottomness = THREE.MathUtils.clamp(0.5 - y / CAP_HEIGHT, 0, 1);
    const k = (1 + 0.06 * Math.sin(Math.atan2(z, x) * 21) * bottomness) * (1 + (rng() - 0.5) * 0.015);
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/** @returns [{ pivot, mesh, side, home:[x,z], radius }] */
export function buildBottleCapTeams(group, homePalette, awayPalette, seed = 9917) {
  const rng = createSeededRandom(seed);
  const metal = new THREE.MeshStandardMaterial({ color: 0xc9c9cc, metalness: 0.85, roughness: 0.38 });
  const caps = [];
  for (const [side, mirror, palette] of [[SIDE_HOME, 1, homePalette], [SIDE_AWAY, -1, awayPalette]]) {
    TEAM_FORMATION.forEach(([fx, fz], i) => {
      const top = new THREE.MeshStandardMaterial({
        map: paintCapTopTexture(palette, seed + (mirror > 0 ? 1000 : 2000) + i * 37),
        metalness: 0.55, roughness: 0.5,
      });
      const mesh = new THREE.Mesh(createFlattenedCapGeometry(rng), [metal, top, metal]);
      const scale = 0.96 + rng() * 0.08; // no two caps are the same size
      mesh.scale.setScalar(scale);
      mesh.position.y = (CAP_HEIGHT / 2) * scale;
      mesh.rotation.set(0, rng() * Math.PI * 2, (rng() - 0.5) * 0.03);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const pivot = new THREE.Group();
      pivot.position.set(fx * mirror, 0, fz);
      pivot.add(mesh);
      group.add(pivot);
      caps.push({ pivot, mesh, side, home: [fx * mirror, fz], radius: CAP_RADIUS * scale });
    });
  }
  return caps;
}
