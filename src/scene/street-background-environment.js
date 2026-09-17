// Soft-focus street backdrops per venue: painted walls, signage, plastic
// chairs, a low sun (or street-light) glow and drifting dust motes. Textures
// are pre-blurred at bake time — a fake depth of field that costs nothing.
import * as THREE from 'three';
import { createSeededRandom } from '../core/seeded-random-number-generator.js';

// Three wall slots (left, centre, right) shared by every venue.
const SLOTS = [
  { w: 8, h: 3.8, pos: [-3.6, 0.9, -5.6], ry: 0.25 },
  { w: 4.4, h: 3.0, pos: [1.3, 0.65, -5.0], ry: -0.1 },
  { w: 6.5, h: 3.5, pos: [5.6, 0.8, -6.2], ry: -0.35 },
];

// [base, blotches, sign?] per slot; chairs [x, z, colour].
const BACKDROPS = {
  schoolyard: { walls: [
    ['#e9dcb8', ['#cdbf98', '#f4ead0', '#7fa6b8']],
    ['#6f9fb8', ['#517f98', '#9cc4d6', '#e8dcc0'], { text: 'ADABRAKA PRIMARY', bg: '#f3e3bd', fg: '#2f5d9a' }],
    ['#e0c27a', ['#c7a55a', '#f0d898', '#8a6a3a']],
  ], chairs: [[-2.3, -4.6, 0x2f5d9a], [2.6, -4.4, 0x3d8a5a]] },
  kiosk: { walls: [
    ['#4f8a85', ['#3a6d68', '#79b0aa', '#c8b98e']],
    ['#c8952f', ['#a87720', '#e0b558', '#8a5a1c'], { text: 'KOFI SPOT', bg: '#f3e3bd', fg: '#b33a25' }],
    ['#b0603a', ['#8e4a2a', '#cf8a60', '#6e3a20']],
  ], chairs: [[-2.3, -4.6, 0x3d6db5], [2.6, -4.4, 0xc23b2e]] },
  veranda: { walls: [
    ['#b5643c', ['#93492a', '#d08a5e', '#e2c29a']],
    ['#3f7a5a', ['#2d5c43', '#5f9c78', '#d9c9a2'], { text: 'AUNTIE AMA', bg: '#e9d9b4', fg: '#3f7a5a' }],
    ['#d9c29a', ['#bba27a', '#efdcb8', '#8e6a44']],
  ], chairs: [[-2.1, -4.4, 0xd9c29a], [2.8, -4.7, 0x3f7a5a]] },
  roadside: { walls: [
    ['#8f8a80', ['#6f6a60', '#b0aa9e', '#c9b27a']],
    ['#d23b2a', ['#a82a1c', '#f0c040', '#fff0d0'], { text: 'CHOP BAR', bg: '#f0c040', fg: '#8a1e12' }],
    ['#3a78b5', ['#2a5a8a', '#6aa0d0', '#e8dcc0']],
  ], chairs: [[-2.5, -4.5, 0xe0c030], [2.4, -4.3, 0x3d6db5]] },
  harmattan: { walls: [
    ['#cdb48c', ['#b89c74', '#e2d0b0', '#a08060']],
    ['#b88a5a', ['#9a7048', '#d6b088', '#e8d8bc'], { text: 'TAMALE STATION', bg: '#e8d8bc', fg: '#7a4a2a' }],
    ['#d8c4a4', ['#c0aa88', '#ecdcc2', '#9a8060']],
  ], chairs: [[-2.3, -4.6, 0xd0692a]] },
  night: { walls: [
    ['#2f5a5a', ['#1f4040', '#4a7a78', '#6a5a40']],
    ['#3a2e24', ['#2a2018', '#5a4632', '#c8952f'], { text: 'KOFI SPOT', bg: '#ffe6a8', fg: '#b33a25', lit: true }],
    ['#4a3040', ['#3a2030', '#6a4a5a', '#2a2a3a']],
  ], chairs: [[-2.3, -4.6, 0xc23b2e]] },
};

function blurredCanvasTexture(width, height, paint) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  ctx.filter = 'blur(14px)'; // bake the out-of-focus look into the texture
  paint(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function wallTexture([base, blotches], rng) {
  return blurredCanvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(-40, -40, 600, 340);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = blotches[Math.floor(rng() * blotches.length)];
      ctx.globalAlpha = 0.18 + rng() * 0.35;
      ctx.beginPath();
      ctx.ellipse(rng() * 512, rng() * 256, 24 + rng() * 90, 18 + rng() * 60, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function signTexture(sign) {
  return blurredCanvasTexture(512, 160, (ctx) => {
    ctx.fillStyle = sign.bg;
    ctx.fillRect(30, 30, 452, 100);
    ctx.fillStyle = sign.fg;
    ctx.font = 'bold 54px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(sign.text, 256, 100); // illegible through the blur — colour, not copy
  });
}

export function softGlowSpriteTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255, 232, 190, 0.9)');
  g.addColorStop(1, 'rgba(255, 232, 190, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function buildStreetBackdrop(group, backdropKey, preset) {
  const rng = createSeededRandom(3361);
  const spec = BACKDROPS[backdropKey] ?? BACKDROPS.kiosk;
  const tint = new THREE.Color(preset.backdropTint);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0xa5713f, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.92;
  group.add(ground);

  spec.walls.forEach((wallSpec, i) => {
    const slot = SLOTS[i];
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(slot.w, slot.h),
      new THREE.MeshBasicMaterial({ map: wallTexture(wallSpec, rng), color: tint }));
    wall.position.set(...slot.pos);
    wall.rotation.y = slot.ry;
    group.add(wall);
    const sign = wallSpec[2];
    if (sign) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(slot.w * 0.8, slot.w * 0.25),
        new THREE.MeshBasicMaterial({ map: signTexture(sign), transparent: true, color: sign.lit ? 0xffffff : tint }));
      plane.position.set(slot.pos[0], slot.pos[1] + slot.h * 0.18, slot.pos[2] + 0.05);
      plane.rotation.y = slot.ry;
      group.add(plane);
    }
  });

  for (const [x, z, col] of spec.chairs) { // blurred plastic-chair silhouettes
    const chair = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.5, 4, 10),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, transparent: true, opacity: 0.65, depthWrite: false }));
    chair.position.set(x, -0.35, z);
    group.add(chair);
  }

  const glowTexture = softGlowSpriteTexture();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, color: preset.glow.color, transparent: true, opacity: preset.glow.opacity,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  glow.scale.setScalar(7);
  glow.position.set(-7.5, 3.6, -7.5);
  group.add(glow);

  const count = preset.dustMotes ?? 90;
  const positions = new Float32Array(count * 3);
  const drift = [];
  for (let i = 0; i < count; i++) {
    positions.set([(rng() - 0.5) * 5.5, 0.05 + rng() * 1.6, (rng() - 0.5) * 4], i * 3);
    drift.push({ vx: (rng() - 0.5) * 0.03, vy: 0.004 + rng() * 0.012, ph: rng() * 6.28 });
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    map: glowTexture, size: 0.02, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  group.add(dust);

  return {
    update(t, dt) {
      const p = dustGeo.attributes.position;
      for (let i = 0; i < count; i++) {
        let y = p.getY(i) + drift[i].vy * dt * 12;
        const x = p.getX(i) + (drift[i].vx + Math.sin(t * 0.4 + drift[i].ph) * 0.015) * dt * 12;
        if (y > 1.8) y = 0.02;
        p.setXYZ(i, x > 3 ? -3 : x, y, p.getZ(i));
      }
      p.needsUpdate = true;
    },
  };
}
