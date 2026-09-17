// The ground around the table — the part of each venue the 45° play camera
// actually sees. One unique (non-tiling) canvas per venue so markings like the
// hopscotch, the veranda step, the gutter and the lane line sit exactly in
// world space. A plain far plane carries the colour out into the fog.
import * as THREE from 'three';
import { GROUND_Y, createCanvas, toTexture, softBlotch, speckle, pebbles, rgba } from './canvas-texture-helpers.js';
import {
  GROUND_ZONE, GROUND_PPU as PPU, GROUND_CANVAS_W as W, GROUND_CANVAS_H as H, px, pz,
} from './ground-zone-mapping.js';
import { footprints, tyreTracks, hopscotch } from './ground-marking-painters.js';

const rows = (z0, z1) => [pz(z0), pz(z1) - pz(z0)];

function earth(ctx, rng, { base, light, dark }, region = [0, H]) {
  const [y, h] = region;
  ctx.fillStyle = base;
  ctx.fillRect(0, y, W, h);
  for (let i = 0; i < 70; i++) {
    softBlotch(ctx, rng() * W, y + rng() * h, 60 + rng() * 260, rng() > 0.5 ? rgba(light, 0.18) : rgba(dark, 0.2));
  }
  speckle(ctx, rng, 30000 * (h / H), W, h, (r) => (r() > 0.5 ? rgba(light, 0.22) : rgba(dark, 0.3)), 2);
  ctx.save();
  ctx.translate(0, y);
  pebbles(ctx, rng, 700 * (h / H), W, h, [rgba(dark, 0.45), rgba(light, 0.35), 'rgba(120,110,100,0.45)']);
  ctx.restore();
}

const PAINTERS = {
  playground(ctx, rng) {
    earth(ctx, rng, { base: '#a8683f', light: '#d8a473', dark: '#5e3218' });
    softBlotch(ctx, px(0), pz(-4), 900, 'rgba(225, 180, 130, 0.2)'); // trampled bare patch
    footprints(ctx, rng, 26, -9, 4);
    hopscotch(ctx, rng, -3.4, -5.6);
  },
  laterite(ctx, rng) {
    earth(ctx, rng, { base: '#9a532d', light: '#cf8a55', dark: '#4e2410' });
    tyreTracks(ctx, rng, -7.6, 4.8);
    footprints(ctx, rng, 30, -9, 4, 0.2);
    for (let i = 0; i < 6; i++) softBlotch(ctx, rng() * W, pz(-8 + rng() * 5), 40 + rng() * 90, 'rgba(20, 14, 10, 0.35)'); // oil
  },
  verandaFloor(ctx, rng) {
    const stepZ = -5.4;
    earth(ctx, rng, { base: '#a26a40', light: '#d6a270', dark: '#5a3418' }, rows(GROUND_ZONE.minZ, stepZ));
    for (let i = 0; i < 90; i++) { // broom-swept arcs in the yard
      const x = rng() * W, y = rng() * pz(stepZ), r = 60 + rng() * 140;
      ctx.strokeStyle = `rgba(${rng() > 0.5 ? '230,190,150' : '70,40,20'}, 0.09)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.7);
      ctx.stroke();
    }
    const [floorY, floorH] = rows(stepZ, GROUND_ZONE.maxZ);
    ctx.fillStyle = '#8b2c20';
    ctx.fillRect(0, floorY, W, floorH);
    for (let i = 0; i < 40; i++) softBlotch(ctx, rng() * W, floorY + rng() * floorH, 80 + rng() * 240, 'rgba(255, 205, 185, 0.09)'); // polish
    for (let i = 0; i < 22; i++) softBlotch(ctx, px(-8 + rng() * 16), floorY + rng() * floorH, 60 + rng() * 150, 'rgba(210, 150, 120, 0.2)'); // worn
    ctx.strokeStyle = 'rgba(40, 10, 6, 0.45)'; // scored screed squares
    ctx.lineWidth = 3;
    for (let g = GROUND_ZONE.minX; g <= GROUND_ZONE.maxX; g += 3.2) { ctx.beginPath(); ctx.moveTo(px(g), floorY); ctx.lineTo(px(g), H); ctx.stroke(); }
    for (let g = stepZ; g <= GROUND_ZONE.maxZ; g += 3.2) { ctx.beginPath(); ctx.moveTo(0, pz(g)); ctx.lineTo(W, pz(g)); ctx.stroke(); }
    ctx.fillStyle = '#b8a48c'; // concrete step nosing + the shadow it throws onto the yard
    ctx.fillRect(0, pz(stepZ), W, 0.42 * PPU);
    const shadow = ctx.createLinearGradient(0, pz(stepZ) - 40, 0, pz(stepZ));
    shadow.addColorStop(0, 'rgba(20, 10, 4, 0)');
    shadow.addColorStop(1, 'rgba(20, 10, 4, 0.55)');
    ctx.fillStyle = shadow;
    ctx.fillRect(0, pz(stepZ) - 40, W, 40);
  },
  roadside(ctx, rng) {
    earth(ctx, rng, { base: '#96592f', light: '#c98a57', dark: '#4a2410' }, rows(-4.3, GROUND_ZONE.maxZ));
    const [roadY, roadH] = rows(GROUND_ZONE.minZ, -5.3);
    ctx.fillStyle = '#3c3a37';
    ctx.fillRect(0, roadY, W, roadH);
    speckle(ctx, rng, 26000, W, roadH, (r) => (r() > 0.5 ? 'rgba(150,145,138,0.4)' : 'rgba(18,17,16,0.45)'), 2);
    for (let i = 0; i < 30; i++) softBlotch(ctx, rng() * W, roadY + rng() * roadH, 50 + rng() * 200, 'rgba(95, 90, 82, 0.25)');
    ctx.fillStyle = 'rgba(232, 226, 210, 0.7)'; // worn edge line, broken in places
    for (let x = 0; x < W; x += 30) if (rng() > 0.18) ctx.fillRect(x, pz(-6.1), 30, 0.28 * PPU);
    tyreTracks(ctx, rng, -8.2, 5);
    ctx.fillStyle = '#26231f'; // gutter shadow band under the 3D channel
    ctx.fillRect(0, pz(-5.3), W, PPU);
  },
  stationSand(ctx, rng) {
    earth(ctx, rng, { base: '#c9ad86', light: '#eadcc0', dark: '#8c704e' });
    tyreTracks(ctx, rng, -7.2, 6.4);
    tyreTracks(ctx, rng, -3.8, 6.4);
    footprints(ctx, rng, 40, -9, 4, 0.13);
    for (let i = 0; i < 26; i++) softBlotch(ctx, rng() * W, rng() * H, 120 + rng() * 300, 'rgba(240, 228, 206, 0.22)'); // drifts
  },
  nightConcrete(ctx, rng) {
    earth(ctx, rng, { base: '#a88c66', light: '#d6c3a0', dark: '#5e4a33' });
    const [slabY, slabH] = rows(-4.6, GROUND_ZONE.maxZ);
    ctx.fillStyle = '#8b857b';
    ctx.fillRect(0, slabY, W, slabH);
    speckle(ctx, rng, 16000, W, slabH, (r) => (r() > 0.5 ? 'rgba(190,185,175,0.3)' : 'rgba(40,38,34,0.35)'), 1.8);
    for (let i = 0; i < 30; i++) softBlotch(ctx, rng() * W, slabY + rng() * slabH, 50 + rng() * 180, 'rgba(50, 45, 40, 0.3)'); // damp
    ctx.strokeStyle = 'rgba(30, 28, 25, 0.6)';
    for (let i = 0; i < 18; i++) { // cracks
      let x = rng() * W, y = slabY + rng() * slabH;
      ctx.lineWidth = 1.5 + rng() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 10; s++) { x += (rng() - 0.5) * 90; y += (rng() - 0.3) * 50; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    speckle(ctx, rng, 900, W, H, () => 'rgba(235, 240, 245, 0.45)', 1.2); // fish-scale glints
  },
};

/** @returns {THREE.Group} textured ground zone + far fallback plane */
export function buildVenueGround(kind, rng) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  (PAINTERS[kind] ?? PAINTERS.laterite)(ctx, rng);

  const group = new THREE.Group();
  const zone = new THREE.Mesh(
    new THREE.PlaneGeometry(W / PPU, H / PPU),
    new THREE.MeshStandardMaterial({ map: toTexture(canvas), roughness: kind === 'verandaFloor' ? 0.55 : 0.97 })
  );
  zone.rotation.x = -Math.PI / 2;
  zone.position.set((GROUND_ZONE.minX + GROUND_ZONE.maxX) / 2, GROUND_Y, (GROUND_ZONE.minZ + GROUND_ZONE.maxZ) / 2);
  zone.receiveShadow = true;

  const [r, g, b] = ctx.getImageData(W / 2, 20, 1, 1).data; // far ground continues the back-of-zone colour
  const far = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${r},${g},${b})`), roughness: 1 })
  );
  far.rotation.x = -Math.PI / 2;
  far.position.y = GROUND_Y - 0.02;
  far.receiveShadow = true;
  group.add(zone, far);
  return group;
}
