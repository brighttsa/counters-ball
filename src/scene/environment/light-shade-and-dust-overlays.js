// Atmosphere layers laid over each venue: dappled leaf shade from an unseen
// neem or mango tree that sways across the ground, drifting harmattan dust
// banks, and a night bulb that hums and occasionally dips.
import * as THREE from 'three';
import { GROUND_Y, createCanvas, toTexture, blurredCopy, softBlotch } from './canvas-texture-helpers.js';
import { GROUND_ZONE } from './ground-zone-mapping.js';

export function buildDappledLeafShade(group, rng, strength) {
  const c = createCanvas(1024, 640);
  const ctx = c.getContext('2d');
  for (let i = 0; i < 320; i++) { // leaf clusters
    ctx.fillStyle = `rgba(18, 11, 5, ${0.55 + rng() * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(rng() * 1024, rng() * 640, 12 + rng() * 55, 8 + rng() * 34, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'destination-out'; // sun flecks punched through the canopy
  for (let i = 0; i < 520; i++) {
    ctx.beginPath();
    ctx.arc(rng() * 1024, rng() * 640, 3 + rng() * 11, 0, Math.PI * 2);
    ctx.fill();
  }
  // Keep the shade off the far corners so it reads as one tree, not a pattern.
  ctx.globalCompositeOperation = 'destination-in';
  const falloff = ctx.createRadialGradient(360, 300, 120, 360, 300, 700);
  falloff.addColorStop(0, 'rgba(0,0,0,1)');
  falloff.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = falloff;
  ctx.fillRect(0, 0, 1024, 640);

  const layers = [7, 3].map((blur, i) => {
    const texture = toTexture(blurredCopy(c, blur));
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(GROUND_ZONE.maxX - GROUND_ZONE.minX, GROUND_ZONE.maxZ - GROUND_ZONE.minZ),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: strength * (i ? 0.45 : 0.7), depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, GROUND_Y + 0.02 + i * 0.005, (GROUND_ZONE.minZ + GROUND_ZONE.maxZ) / 2);
    mesh.renderOrder = 1;
    group.add(mesh);
    return texture;
  });

  return (t) => {
    layers.forEach((texture, i) => {
      const k = i ? 1.6 : 1;
      texture.offset.set(Math.sin(t * 0.55 * k) * 0.005 + Math.sin(t * 1.3 * k) * 0.002, Math.cos(t * 0.42 * k) * 0.004);
    });
  };
}

export function buildHarmattanDustSheets(group, rng, count) {
  const c = createCanvas(1024, 256);
  const ctx = c.getContext('2d');
  for (let i = 0; i < 90; i++) softBlotch(ctx, rng() * 1024, 40 + rng() * 176, 40 + rng() * 140, 'rgba(238, 226, 206, 0.5)');
  const base = blurredCopy(c, 18);
  const sheets = [];
  for (let i = 0; i < count; i++) {
    const texture = toTexture(base);
    texture.wrapS = THREE.RepeatWrapping;
    texture.offset.x = rng();
    const sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(32, 3.4),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.32, depthWrite: false })
    );
    sheet.position.set(0, GROUND_Y + 1.2 + i * 0.5, -2.8 - i * 2.1);
    sheet.renderOrder = 2;
    group.add(sheet);
    sheets.push({ texture, speed: 0.006 + i * 0.004 });
  }
  return (t, dt) => sheets.forEach((s) => { s.texture.offset.x += dt * s.speed; });
}

/** Warm bulb hum + rare brown-out dips. Returns null when the venue has no bulb. */
export function buildBulbFlicker(group, glowMaterials = [], spillLights = []) {
  const bulb = group.getObjectByProperty('isSpotLight', true);
  if (!bulb) return null;
  const base = bulb.intensity;
  const spillBase = spillLights.map((light) => light.intensity);
  let dip = 0;
  return (t, dt) => {
    if (Math.random() < dt * 0.35) dip = 0.18; // a dip roughly every three seconds
    dip = Math.max(0, dip - dt);
    const hum = 0.96 + Math.sin(t * 23.1) * 0.025 + Math.sin(t * 7.3 + 1.1) * 0.015;
    const level = hum * (dip > 0 ? 0.55 : 1);
    bulb.intensity = base * level;
    for (const material of glowMaterials) material.opacity = 0.9 * level;
    spillLights.forEach((light, i) => { light.intensity = spillBase[i] * level; }); // same circuit as the bulb
  };
}
