import * as THREE from 'three';
import { createCanvas } from './canvas-texture-helpers.js';

export function venueRoughnessTexture(kind, rng) {
  const canvas = createCanvas(128, 128), ctx = canvas.getContext('2d');
  const polished = kind === 'verandaFloor', damp = kind === 'nightConcrete';
  ctx.fillStyle = polished ? '#a5a5a5' : damp ? '#c8c8c8' : '#eeeeee';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 180; i++) {
    const shade = Math.floor((polished || damp ? 65 : 180) + rng() * 65);
    ctx.fillStyle = `rgba(${shade},${shade},${shade},0.24)`;
    ctx.fillRect(rng() * 128, rng() * 128, 2 + rng() * 18, 1 + rng() * 4);
  }
  // Roughness is linear data, never an sRGB colour texture.
  return new THREE.CanvasTexture(canvas);
}
