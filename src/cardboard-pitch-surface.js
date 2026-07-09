// The tabletop: a rough cardboard sheet with fibres, stains, dents and
// hand-drawn chalk markings, sitting on a plywood board with wooden battens.
import * as THREE from 'three';
import { drawChalkPitchMarkings } from './chalk-pitch-markings.js';
import { createSeededRandom } from './seeded-random-number-generator.js';
import {
  TABLE_HALF_LENGTH as TL, TABLE_HALF_WIDTH as TW,
  WALL_HALF_LENGTH as WL, WALL_HALF_WIDTH as WW,
} from './pitch-dimensions-and-constants.js';

const CANVAS_W = 1408, CANVAS_H = 1024;
const PX_PER_UNIT = CANVAS_W / (TL * 2);
const toPx = (wx, wz) => [CANVAS_W / 2 + wx * PX_PER_UNIT, CANVAS_H / 2 + wz * PX_PER_UNIT];

function paintCardboardBase(ctx, rng) {
  ctx.fillStyle = '#bd9163';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Corrugation: faint vertical banding like flattened box ridges.
  for (let x = 0; x < CANVAS_W; x += 9) {
    ctx.fillStyle = `rgba(90, 58, 28, ${0.02 + rng() * 0.03})`;
    ctx.fillRect(x, 0, 3.5, CANVAS_H);
  }
  // Fibre streaks: thousands of short light/dark hairs.
  for (let i = 0; i < 5200; i++) {
    const x = rng() * CANVAS_W, y = rng() * CANVAS_H;
    const len = 3 + rng() * 16, a = (rng() - 0.5) * 0.7;
    const light = rng() > 0.5;
    ctx.strokeStyle = light
      ? `rgba(226, 194, 148, ${0.05 + rng() * 0.1})`
      : `rgba(84, 52, 24, ${0.04 + rng() * 0.09})`;
    ctx.lineWidth = 0.8 + rng();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  // Water stains and sun-fade blotches.
  for (let i = 0; i < 14; i++) {
    const x = rng() * CANVAS_W, y = rng() * CANVAS_H, r = 50 + rng() * 150;
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    const dark = rng() > 0.45;
    g.addColorStop(0, dark ? 'rgba(96, 60, 26, 0.1)' : 'rgba(235, 205, 160, 0.1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Scuffed marker rub lines and tiny scratches across the play area.
  for (let i = 0; i < 90; i++) {
    const x = rng() * CANVAS_W, y = rng() * CANVAS_H;
    ctx.strokeStyle = `rgba(60, 36, 16, ${0.05 + rng() * 0.12})`;
    ctx.lineWidth = 0.6 + rng() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (rng() - 0.5) * 80, y + (rng() - 0.5) * 80,
      x + (rng() - 0.5) * 130, y + (rng() - 0.5) * 130);
    ctx.stroke();
  }
  // Frayed darker edges where the sheet has been handled for years.
  const edge = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.42,
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.86);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(62, 36, 12, 0.4)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function paintBumpMap(bctx, rng) {
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (let i = 0; i < 9000; i++) {
    const v = 100 + Math.floor(rng() * 90);
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.fillRect(rng() * CANVAS_W, rng() * CANVAS_H, 1 + rng() * 2.5, 1 + rng() * 2.5);
  }
  for (let i = 0; i < 26; i++) { // dents: soft dark depressions
    const x = rng() * CANVAS_W, y = rng() * CANVAS_H, r = 14 + rng() * 42;
    const g = bctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(52, 52, 52, 0.55)');
    g.addColorStop(1, 'rgba(52, 52, 52, 0)');
    bctx.fillStyle = g;
    bctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

export function buildCardboardPitchTable(scene) {
  const rng = createSeededRandom(20260709);

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W; canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  paintCardboardBase(ctx, rng);
  drawChalkPitchMarkings(ctx, toPx, rng);

  const bump = document.createElement('canvas');
  bump.width = CANVAS_W; bump.height = CANVAS_H;
  paintBumpMap(bump.getContext('2d'), rng);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const bumpMap = new THREE.CanvasTexture(bump);

  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(TL * 2, TW * 2),
    new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 0.9, roughness: 0.96, metalness: 0 })
  );
  top.rotation.x = -Math.PI / 2;
  top.receiveShadow = true;
  scene.add(top);

  // Plywood board underneath + rough crate stand: gives the table real depth.
  const plyMat = new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.9 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(TL * 2 + 0.04, 0.06, TW * 2 + 0.04), plyMat);
  board.position.y = -0.032;
  board.castShadow = true;
  scene.add(board);
  const crate = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x5f4326, roughness: 0.95 }));
  crate.position.y = -0.49;
  scene.add(crate);

  // Wooden battens nailed around the rim — the walls the caps bounce off.
  const battenMat = new THREE.MeshStandardMaterial({ color: 0x9c7444, roughness: 0.85 });
  const battenH = 0.05, battenT = 0.045;
  for (const side of [-1, 1]) {
    const long = new THREE.Mesh(new THREE.BoxGeometry(WL * 2 + battenT * 2, battenH, battenT), battenMat);
    long.position.set(0, battenH / 2, side * (WW + battenT / 2));
    long.rotation.y = (rng() - 0.5) * 0.01;
    long.castShadow = true; long.receiveShadow = true;
    scene.add(long);
    const short = new THREE.Mesh(new THREE.BoxGeometry(battenT, battenH, WW * 2), battenMat);
    short.position.set(side * (WL + battenT / 2), battenH / 2, 0);
    short.castShadow = true; short.receiveShadow = true;
    scene.add(short);
  }
  return { tableTop: top };
}
