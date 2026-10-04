// Close-up caps. The game's caps are built for a camera 4 units away (44 rim
// segments, 256 px faces); a lens 20 cm from the rim needs the same object at
// film resolution: a finer crimped skirt and a 1024 px hand-painted face with
// its own scratch relief. The NXWRTH face is printed artwork on enamel, worn
// like every other cap on the table.
import * as THREE from 'three';
import { createSeededRandom } from '../../src/core/seeded-random-number-generator.js';
import { CAP_RADIUS, CAP_HEIGHT, BALL_RADIUS } from '../../src/core/pitch-dimensions-and-constants.js';
import { INK } from './nxwrth-promo-timeline-config.js';

const S = 1024, C = S / 2;

export function createHeroCapGeometry() {
  const geo = new THREE.CylinderGeometry(CAP_RADIUS * 0.94, CAP_RADIUS, CAP_HEIGHT, 168, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (Math.hypot(x, z) < 1e-5) continue;
    const bottomness = THREE.MathUtils.clamp(0.5 - y / CAP_HEIGHT, 0, 1);
    const k = 1 + 0.06 * Math.sin(Math.atan2(z, x) * 21) * bottomness; // 21 crimps, as on the game's caps
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

function wearAndTear(ctx, bump, rng) {
  for (let i = 0; i < 26; i++) { // chips down to bare metal, worst where the shoulder takes the knocks
    const a = rng() * Math.PI * 2, d = 430 + rng() * 70;
    const x = C + Math.cos(a) * d, y = C + Math.sin(a) * d, rx = 4 + rng() * 15, ry = 3 + rng() * 7, rot = a + Math.PI / 2 + (rng() - 0.5);
    ctx.fillStyle = `rgba(190, 190, 192, ${0.6 + rng() * 0.4})`;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
    bump.fillStyle = '#5a5a5a';
    bump.beginPath(); bump.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); bump.fill();
  }
  for (let i = 0; i < 120; i++) { // rust specks
    ctx.fillStyle = `rgba(122, 59, 30, ${0.2 + rng() * 0.4})`;
    ctx.beginPath(); ctx.arc(rng() * S, rng() * S, 2 + rng() * 7, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 70; i++) { // scratches: some catch the light, some hold dirt
    const x = rng() * S, y = rng() * S, a = rng() * Math.PI, len = 50 + rng() * 260, bright = rng() > 0.45;
    const width = 1.4 + rng() * 2.6, ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    ctx.strokeStyle = bright ? `rgba(235,235,235,${0.12 + rng() * 0.25})` : `rgba(26,18,10,${0.12 + rng() * 0.22})`;
    ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
    bump.strokeStyle = 'rgba(40,40,40,0.8)';
    bump.lineWidth = width;
    bump.beginPath(); bump.moveTo(x, y); bump.lineTo(ex, ey); bump.stroke();
  }
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  for (let i = 0; i < 14; i++) { // a fingerprint
    ctx.beginPath(); ctx.arc(610 + rng() * 60, 380 + rng() * 60, 44 + i * 12, rng() * 2, rng() * 2 + 2.2); ctx.stroke();
  }
  ctx.restore();
}

/** Paint that was brushed on by hand: speckled away where the brush ran dry. */
function dryBrush(ctx, rng, count = 1400) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = 0.25 + rng() * 0.6;
    ctx.beginPath(); ctx.arc(rng() * S, rng() * S, 0.8 + rng() * 3.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function starArt(ctx) {
  ctx.fillStyle = '#efe4cd';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    ctx.lineTo(C + Math.cos(a) * 250, C + Math.sin(a) * 250);
  }
  ctx.closePath(); ctx.fill();
}

function nxwrthArt(ctx, rng) {
  ctx.strokeStyle = INK.gold;
  for (let i = 0; i < 90; i++) { // a ring painted in short, uneven brush pulls
    const a = (i / 90) * Math.PI * 2;
    ctx.lineWidth = 12 + rng() * 9;
    ctx.beginPath(); ctx.arc(C, C, 404 + (rng() - 0.5) * 5, a, a + 0.085); ctx.stroke();
  }
  ctx.fillStyle = INK.gold;
  ctx.font = '400 218px Anton';
  ctx.textBaseline = 'alphabetic';
  const letters = [...'NXWRTH'], gap = 8;
  const widths = letters.map((ch) => ctx.measureText(ch).width);
  let x = C - (widths.reduce((sum, w) => sum + w, 0) + gap * (letters.length - 1)) / 2;
  letters.forEach((ch, i) => { // each letter set by hand: never quite on the line
    ctx.save();
    ctx.translate(x + widths[i] / 2, C + 78 + (rng() - 0.5) * 12);
    ctx.rotate((rng() - 0.5) * 0.045);
    ctx.fillText(ch, -widths[i] / 2, 0);
    ctx.restore();
    x += widths[i] + gap;
  });
  ctx.lineWidth = 16; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(C - 210, C + 132); ctx.quadraticCurveTo(C, C + 150, C + 222, C + 126); ctx.stroke();
}

const ARTWORK = { star: starArt, nxwrth: nxwrthArt };

/** @returns {{ map, bumpMap }} */
export function paintHeroCapFace({ paint, paintDark, art }, seed) {
  const rng = createSeededRandom(seed);
  const canvas = Object.assign(document.createElement('canvas'), { width: S, height: S });
  const ctx = canvas.getContext('2d');
  const bumpCanvas = Object.assign(document.createElement('canvas'), { width: S, height: S });
  const bump = bumpCanvas.getContext('2d');
  bump.fillStyle = '#808080';
  bump.fillRect(0, 0, S, S);

  const enamel = ctx.createRadialGradient(408, 392, 80, C, C, C);
  enamel.addColorStop(0, paint); enamel.addColorStop(0.72, paint);
  enamel.addColorStop(0.88, paintDark); enamel.addColorStop(1, '#4a4a4a');
  ctx.fillStyle = enamel;
  ctx.fillRect(0, 0, S, S);

  const layer = Object.assign(document.createElement('canvas'), { width: S, height: S });
  const layerCtx = layer.getContext('2d');
  ARTWORK[art](layerCtx, rng);
  dryBrush(layerCtx, rng);
  ctx.globalAlpha = 0.94;
  ctx.drawImage(layer, 0, 0);
  ctx.globalAlpha = 1;
  bump.globalAlpha = 0.5; // printed ink sits proud of the enamel
  bump.filter = 'brightness(0) invert(1)';
  bump.drawImage(layer, 0, 0);
  bump.filter = 'none';
  bump.globalAlpha = 1;
  wearAndTear(ctx, bump, rng);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 16;
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.anisotropy = 8;
  return { map, bumpMap };
}

/**
 * The paper ball for a close lens. The game's ball is a coarse icosahedron whose
 * faces part when it fills the frame; this one is a closed surface, crumpled by
 * a smooth field so neighbouring faces always meet, and lit as flat paper facets.
 */
export function upgradeToHeroBall(ballMesh) {
  const geo = new THREE.SphereGeometry(BALL_RADIUS, 30, 20);
  const pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize().multiplyScalar(5.3);
    const crumple = Math.sin(n.x * 2.1 + n.y * 1.3) * Math.sin(n.y * 2.7 - n.z * 1.9) + 0.6 * Math.sin(n.z * 4.1 + n.x * 3.3) * Math.sin(n.x * 3.7 - n.y * 2.9);
    v.multiplyScalar(1 + crumple * 0.07);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  ballMesh.geometry.dispose();
  ballMesh.geometry = geo;
  ballMesh.material.flatShading = true;
  ballMesh.material.needsUpdate = true;
}

/** Swaps one of a stage's caps for its film-resolution double. The old GPU resources are released. */
export function upgradeToHeroCap(cap, palette, seed) {
  const { map, bumpMap } = paintHeroCapFace(palette, seed);
  const [, top] = cap.mesh.material;
  top.map?.dispose();
  cap.mesh.geometry.dispose();
  cap.mesh.geometry = createHeroCapGeometry();
  // Tin-plate skirt: less of a mirror than the game's, so one bulb still shows every crimp.
  const skirt = new THREE.MeshStandardMaterial({ color: 0xd2d0cb, metalness: 0.55, roughness: 0.42 });
  cap.mesh.material = [skirt, new THREE.MeshStandardMaterial({
    map, bumpMap, bumpScale: 0.6, metalness: 0.6, roughness: 0.44,
  }), skirt];
  top.dispose();
  return cap;
}
