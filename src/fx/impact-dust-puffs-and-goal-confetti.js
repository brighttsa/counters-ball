// Pooled particles: warm dust puffs on every contact, a faint dust trail
// behind a fast ball, and a burst of newspaper + flag-coloured paper scraps
// that flutters down and stays on the table until kickoff.
import * as THREE from 'three';
import { softGlowSpriteTexture } from '../scene/environment/canvas-texture-helpers.js';
import { WALL_HALF_LENGTH, WALL_HALF_WIDTH } from '../core/pitch-dimensions-and-constants.js';

const DUST_POOL = 70;
const CONFETTI_COUNT = 180;
const CONFETTI_COLORS = [0xefe4cd, 0xe2d8c2, 0xc8342a, 0xdfb94f, 0x2c6e4b, 0x1d130b];

export class ImpactParticles {
  constructor(parent) {
    const texture = softGlowSpriteTexture();
    this.dust = Array.from({ length: DUST_POOL }, () => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture, color: 0xf1e2c4, transparent: true, opacity: 0, depthWrite: false,
      }));
      sprite.visible = false;
      parent.add(sprite);
      return { sprite, life: 0, maxLife: 1, vel: new THREE.Vector3(), size: 0.05, alpha: 0.5 };
    });
    this.nextDust = 0;

    this.confetti = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.03, 0.02),
      new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9 }),
      CONFETTI_COUNT);
    this.confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.confetti.frustumCulled = false;
    this.confetti.castShadow = true;
    const color = new THREE.Color();
    this.bits = Array.from({ length: CONFETTI_COUNT }, (_, i) => {
      this.confetti.setColorAt(i, color.setHex(CONFETTI_COLORS[i % CONFETTI_COLORS.length]));
      return { active: false, landed: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Vector3(), spin: new THREE.Vector3() };
    });
    this.dummy = new THREE.Object3D();
    parent.add(this.confetti);
    this.clearConfetti();
  }

  spawnDust(x, y, z, vx, vy, vz, size, life, alpha) {
    const p = this.dust[this.nextDust];
    this.nextDust = (this.nextDust + 1) % DUST_POOL;
    p.sprite.position.set(x, y, z);
    p.vel.set(vx, vy, vz);
    Object.assign(p, { size, life, maxLife: life, alpha });
    p.sprite.visible = true;
  }

  /** @param strength 0..1 */
  dustPuff(x, z, strength) {
    const count = Math.min(9, Math.round(2 + strength * 8));
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, speed = 0.04 + Math.random() * 0.22 * (0.4 + strength);
      this.spawnDust(x, 0.012, z, Math.cos(a) * speed, 0.02 + Math.random() * 0.07, Math.sin(a) * speed,
        0.025 + strength * 0.05, 0.45 + Math.random() * 0.4, 0.22 + strength * 0.35);
    }
  }

  trail(x, z, velocity = { x: 0, y: 0 }) {
    const speed = Math.hypot(velocity.x, velocity.y);
    const fast = Math.min(1, speed / 5);
    this.spawnDust(x, 0.01, z, -velocity.x * 0.04, 0.015, -velocity.y * 0.04,
      0.018 + fast * 0.012, 0.12 + fast * 0.1, 0.12 + fast * 0.12);
  }

  contactFlash(x, z) {
    this.spawnDust(x, 0.04, z, 0, 0.015, 0, 0.11, 0.1, 0.8);
  }

  setVisible(visible) {
    this.confetti.visible = visible;
    for (const p of this.dust) p.sprite.visible = visible && p.life > 0;
  }

  confettiBurst(goalX) {
    const sign = Math.sign(goalX);
    for (const b of this.bits) {
      b.active = true;
      b.landed = false;
      b.pos.set(goalX - sign * 0.08 + (Math.random() - 0.5) * 0.2, 0.22 + Math.random() * 0.15, (Math.random() - 0.5) * 0.5);
      b.vel.set(-sign * (0.3 + Math.random() * 1.1), 1.1 + Math.random() * 1.6, (Math.random() - 0.5) * 1.6);
      b.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      b.spin.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
    }
  }

  clearConfetti() {
    this.dummy.scale.setScalar(0);
    this.dummy.updateMatrix();
    this.bits.forEach((b, i) => {
      b.active = false;
      this.confetti.setMatrixAt(i, this.dummy.matrix);
    });
    this.confetti.instanceMatrix.needsUpdate = true;
  }

  update(dt) {
    if (dt <= 0) return;
    for (const p of this.dust) {
      if (p.life <= 0) continue;
      p.life -= dt;
      const t = 1 - Math.max(0, p.life) / p.maxLife;
      p.sprite.position.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(Math.max(0, 1 - 2.5 * dt));
      p.sprite.scale.setScalar(p.size * (1 + t * 2.2));
      p.sprite.material.opacity = p.alpha * Math.pow(1 - t, 1.5);
      if (p.life <= 0) p.sprite.visible = false;
    }

    let anyActive = false;
    const d = this.dummy;
    this.bits.forEach((b, i) => {
      if (!b.active) return;
      anyActive = true;
      if (!b.landed) {
        b.vel.y -= 3.2 * dt;                                // paper floats
        b.vel.multiplyScalar(Math.max(0, 1 - 1.6 * dt));
        b.vel.x += Math.sin(b.rot.y * 3) * 0.6 * dt;       // flutter
        b.pos.addScaledVector(b.vel, dt);
        b.rot.addScaledVector(b.spin, dt);
        b.pos.x = THREE.MathUtils.clamp(b.pos.x, -WALL_HALF_LENGTH, WALL_HALF_LENGTH);
        b.pos.z = THREE.MathUtils.clamp(b.pos.z, -WALL_HALF_WIDTH, WALL_HALF_WIDTH);
        if (b.pos.y <= 0.002) {
          b.pos.y = 0.002;
          b.landed = true;
          b.rot.set(-Math.PI / 2, 0, b.rot.z); // settle flat
        }
      }
      d.position.copy(b.pos);
      d.rotation.set(b.rot.x, b.rot.y, b.rot.z);
      d.scale.setScalar(1);
      d.updateMatrix();
      this.confetti.setMatrixAt(i, d.matrix);
    });
    if (anyActive) this.confetti.instanceMatrix.needsUpdate = true;
  }
}
