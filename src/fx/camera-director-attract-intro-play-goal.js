// The camera as a director: a slow drifting sweep behind the menus, a
// crane-in flyover before kickoff, a breathing 45° play view that leans
// gently toward the ball, a push-in on goals, spring kicks on flicks and
// trauma-based shake (smooth noise, never random jitter).
import * as THREE from 'three';

const BASE_TARGET = new THREE.Vector3(0.05, 0, -0.08);
const VIEW_DIRECTION = new THREE.Vector3(0.35, 2.62, 2.8).normalize(); // target → camera
const MIN_DISTANCE = 3.85;

const reducedMotion = (() => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
})();
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smoothNoise = (t, f, ph) => Math.sin(t * f + ph) * 0.6 + Math.sin(t * f * 2.3 + ph * 1.7) * 0.4;

export class CameraDirector {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;
    this.mode = 'attract';
    this.fogRange = [2.2, 15];
    this.focus = new THREE.Vector3();
    this.focusTarget = new THREE.Vector3();
    this.trauma = 0;
    this.kickOffset = new THREE.Vector3();
    this.kickVel = new THREE.Vector3();
    this.intro = null;
    this.goal = null;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.fitToViewport();
  }

  /** Pull back on narrow viewports so the whole pitch always fits. */
  fitToViewport() {
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.fitDistance = Math.max(MIN_DISTANCE, 1.85 / (tanHalf * this.camera.aspect), 1.55 / tanHalf);
    this.applyFog();
  }

  setFogRange(range) {
    this.fogRange = range;
    this.applyFog();
  }

  applyFog() {
    if (!this.scene.fog) return;
    this.scene.fog.near = this.fitDistance + this.fogRange[0];
    this.scene.fog.far = this.fitDistance + this.fogRange[1];
  }

  setMode(mode) {
    this.mode = mode;
    this.intro = null;
    this.goal = null;
  }

  playIntro(duration = 2.6) {
    this.setMode('intro');
    this.intro = { t: 0, duration };
  }

  celebrateGoal(goalX, duration = 2.4) {
    if (this.mode === 'play') this.goal = { t: 0, duration, x: goalX };
  }

  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount * (reducedMotion ? 0.3 : 1));
  }

  kick(dirX, dirZ, amount) {
    this.kickVel.x += dirX * amount;
    this.kickVel.z += dirZ * amount;
  }

  setFocus(x, z) {
    this.focusTarget.set(x * 0.12, 0, z * 0.08);
  }

  update(dt, t) {
    const { pos, look, tmp } = this;
    this.focus.lerp(this.focusTarget, 1 - Math.exp(-dt * 2.5));

    if (this.mode === 'attract') {
      const yaw = Math.atan2(VIEW_DIRECTION.x, VIEW_DIRECTION.z) + Math.sin(t * 0.09) * 0.55;
      const r = this.fitDistance * 1.04;
      const horizontal = Math.hypot(VIEW_DIRECTION.x, VIEW_DIRECTION.z) * r;
      pos.set(Math.sin(yaw) * horizontal, VIEW_DIRECTION.y * r * (0.86 + Math.sin(t * 0.13) * 0.06), Math.cos(yaw) * horizontal);
      look.set(0, 0, 0);
    } else {
      pos.copy(BASE_TARGET).addScaledVector(VIEW_DIRECTION, this.fitDistance);
      pos.x += Math.sin(t * 0.22) * 0.03;       // slow handheld breathing
      pos.y += Math.sin(t * 0.31 + 1.4) * 0.018;
      look.copy(BASE_TARGET).add(this.focus);

      if (this.intro) {
        const it = this.intro;
        it.t += dt;
        const p = Math.min(1, it.t / it.duration);
        tmp.set(-2.7, 3.9, 1.3).multiplyScalar(this.fitDistance / MIN_DISTANCE); // high, swung to the side
        pos.lerpVectors(tmp, pos, easeInOutCubic(p));
        if (p >= 1) this.setMode('play');
      }
      if (this.goal) {
        const g = this.goal;
        g.t += dt;
        const p = g.t / g.duration;
        if (p >= 1) {
          this.goal = null;
        } else {
          let w = p < 0.25 ? p / 0.25 : p > 0.75 ? (1 - p) / 0.25 : 1;
          w = w * w * (3 - 2 * w);
          pos.lerp(tmp.set(g.x * 0.55, 1.35, 1.55), w * 0.55);
          look.lerp(tmp.set(g.x, 0, 0), w * 0.8);
        }
      }
    }

    // Flick kick: critically-damped-ish spring offset.
    this.kickVel.addScaledVector(this.kickOffset, -90 * dt).multiplyScalar(Math.exp(-10 * dt));
    this.kickOffset.addScaledVector(this.kickVel, dt);
    pos.add(this.kickOffset);

    this.trauma = Math.max(0, this.trauma - dt * 1.5);
    const shake = this.trauma * this.trauma;
    pos.x += shake * 0.06 * smoothNoise(t, 31, 1);
    pos.y += shake * 0.04 * smoothNoise(t, 27, 2);
    pos.z += shake * 0.06 * smoothNoise(t, 35, 3);

    this.camera.position.copy(pos);
    this.focusDistance = pos.distanceTo(look); // depth-of-field focus rides the look target
    this.camera.lookAt(look);
    this.camera.rotateZ(shake * 0.03 * smoothNoise(t, 23, 4));
  }
}
