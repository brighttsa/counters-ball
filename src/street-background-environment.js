// Soft-focus Ghana street backdrop: faded painted walls, a kiosk sign, dusty
// ground and drifting dust motes. Everything pre-blurred — fake depth of field.
import * as THREE from 'three';
import { createSeededRandom } from './seeded-random-number-generator.js';

function blurredWallTexture(baseColor, blotchColors, rng, signText = null) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 256);
  ctx.filter = 'blur(14px)'; // bake the out-of-focus look into the texture
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = blotchColors[Math.floor(rng() * blotchColors.length)];
    ctx.globalAlpha = 0.18 + rng() * 0.35;
    ctx.beginPath();
    ctx.ellipse(rng() * 512, rng() * 256, 24 + rng() * 90, 18 + rng() * 60,
      rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  if (signText) {
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#f3e3bd';
    ctx.fillRect(60, 60, 392, 90);
    ctx.fillStyle = '#b33a25';
    ctx.font = 'bold 58px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(signText, 256, 126); // illegible through the blur, just colour
  }
  ctx.filter = 'none';
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function softDustSpriteTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255, 232, 190, 0.9)');
  g.addColorStop(1, 'rgba(255, 232, 190, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export function buildStreetBackgroundEnvironment(scene) {
  const rng = createSeededRandom(3361);

  // Dusty roadside ground far below the table.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0xa5713f, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.92;
  scene.add(ground);

  // Blurred street colour: teal wall, kiosk with sign, terracotta house.
  const walls = [
    { tex: blurredWallTexture('#4f8a85', ['#3a6d68', '#79b0aa', '#c8b98e'], rng),
      w: 8, h: 3.8, pos: [-3.6, 0.9, -5.6], ry: 0.25 },
    { tex: blurredWallTexture('#c8952f', ['#a87720', '#e0b558', '#8a5a1c'], rng, 'KOFI SPOT'),
      w: 4.4, h: 3.0, pos: [1.3, 0.65, -5.0], ry: -0.1 },
    { tex: blurredWallTexture('#b0603a', ['#8e4a2a', '#cf8a60', '#6e3a20'], rng),
      w: 6.5, h: 3.5, pos: [5.6, 0.8, -6.2], ry: -0.35 },
  ];
  for (const wcfg of walls) {
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(wcfg.w, wcfg.h),
      new THREE.MeshBasicMaterial({ map: wcfg.tex, fog: true })
    );
    wall.position.set(...wcfg.pos);
    wall.rotation.y = wcfg.ry;
    scene.add(wall);
  }

  // Blurred plastic-chair silhouettes tucked against the walls.
  for (const [x, z, col] of [[-2.3, -4.6, 0x3d6db5], [2.6, -4.4, 0xc23b2e]]) {
    const chair = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.24, 0.5, 4, 10),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.9,
        transparent: true, opacity: 0.65, depthWrite: false })
    );
    chair.position.set(x, -0.35, z);
    scene.add(chair);
  }

  // Soft sprite shared by the sun glow and the dust motes.
  const dustSprite = softDustSpriteTexture();

  // Low sun glow hanging in the haze on the lit side of the frame.
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: dustSprite, color: 0xffd9a0, transparent: true,
    opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  sunGlow.scale.setScalar(7);
  sunGlow.position.set(-7.5, 3.6, -7.5);
  scene.add(sunGlow);

  // Dust motes drifting through the warm light.
  const COUNT = 90;
  const positions = new Float32Array(COUNT * 3);
  const drift = [];
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (rng() - 0.5) * 5.5;
    positions[i * 3 + 1] = 0.05 + rng() * 1.6;
    positions[i * 3 + 2] = (rng() - 0.5) * 4;
    drift.push({ vx: (rng() - 0.5) * 0.03, vy: 0.004 + rng() * 0.012, ph: rng() * 6.28 });
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    map: dustSprite, size: 0.02, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);

  function updateDustMotes(t, dt) {
    const p = dust.geometry.attributes.position;
    for (let i = 0; i < COUNT; i++) {
      let y = p.getY(i) + drift[i].vy * dt * 12;
      const x = p.getX(i) + (drift[i].vx + Math.sin(t * 0.4 + drift[i].ph) * 0.015) * dt * 12;
      if (y > 1.8) y = 0.02;
      p.setXYZ(i, x > 3 ? -3 : x, y, p.getZ(i));
    }
    p.needsUpdate = true;
  }
  return { updateDustMotes };
}
