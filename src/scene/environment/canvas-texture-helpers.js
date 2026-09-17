// Shared canvas-painting helpers for the procedural street environments.
// World scale reminder: 1 unit ≈ 19 cm (a bottle cap is 0.17 units across),
// and the ground the table stands on sits at GROUND_Y.
import * as THREE from 'three';

export const GROUND_Y = -0.92;

export function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  return canvas;
}

export function toTexture(canvas, { srgb = true, anisotropy = 8 } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/** Copy a canvas through a CSS blur — cheap baked softness for distant surfaces. */
export function blurredCopy(canvas, px) {
  const copy = createCanvas(canvas.width, canvas.height);
  const ctx = copy.getContext('2d');
  ctx.filter = `blur(${px}px)`;
  ctx.drawImage(canvas, 0, 0);
  return copy;
}

export function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function softBlotch(ctx, x, y, radius, color) {
  const g = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/** Thousands of tiny grains: dust, grit, sand. */
export function speckle(ctx, rng, count, width, height, colorOf, maxSize = 2) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colorOf(rng);
    const s = 0.6 + rng() * maxSize;
    ctx.fillRect(rng() * width, rng() * height, s, s);
  }
}

/** Small stones with a lit top edge. */
export function pebbles(ctx, rng, count, width, height, tones) {
  for (let i = 0; i < count; i++) {
    const x = rng() * width, y = rng() * height, r = 1.5 + rng() * 5;
    ctx.fillStyle = tones[Math.floor(rng() * tones.length)];
    ctx.beginPath();
    ctx.ellipse(x, y, r * (1 + rng() * 0.5), r, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 240, 215, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.5, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function softGlowSpriteTexture() {
  const canvas = createCanvas(64, 64);
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255, 232, 190, 0.9)');
  g.addColorStop(1, 'rgba(255, 232, 190, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}
