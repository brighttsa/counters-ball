import * as THREE from 'three';
import { createSeededRandom } from '../../src/core/seeded-random-number-generator.js';

export function createImpactBurst(scene) {
  const random = createSeededRandom(12012);
  const positions = new Float32Array(96 * 3);
  const velocities = [];
  for (let i = 0; i < 96; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 0.08 + random() * 0.55;
    positions.set([Math.cos(angle) * radius, 0.08 + random() * 0.38, Math.sin(angle) * radius], i * 3);
    velocities.push([Math.cos(angle) * (0.25 + random() * 0.7), 0.3 + random() * 0.8,
      Math.sin(angle) * (0.25 + random() * 0.7)]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xf4d43e, size: 0.026, transparent: true,
    opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geometry, material);
  points.position.set(0, 0.03, 0);
  points.visible = false;
  scene.add(points);
  let age = 99;
  return {
    update(time, tagTime, dt) {
      if (tagTime === null || tagTime === '' || !Number.isFinite(Number(tagTime))) { points.visible = false; return; }
      age = time - Number(tagTime);
      const p = geometry.attributes.position;
      for (let i = 0; i < velocities.length; i++) {
        const v = velocities[i], t = Math.min(age, 0.7);
        p.setXYZ(i, Math.cos(i * 2.399) * (0.08 + t * v[0] * 0.6), 0.08 + t * v[1] - t * t * 0.55,
          Math.sin(i * 2.399) * (0.08 + t * v[2] * 0.6));
      }
      p.needsUpdate = true;
      material.opacity = age < 0.12 ? 0.85 : Math.max(0, 0.85 * (1 - (age - 0.12) / 0.6));
      points.visible = age >= 0 && age < 0.72;
    },
    dispose() { scene.remove(points); geometry.dispose(); material.dispose(); },
  };
}
