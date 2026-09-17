// The camera as a director: a slow drifting sweep behind the menus, a
// crane-in flyover before kickoff, a breathing 45° play view that leans
// gently toward the ball, a push-in on goals, spring kicks on flicks and
// trauma-based shake (smooth noise, never random jitter).
//
// On tall (portrait) screens the whole view swings a quarter turn so the pitch
// runs up the screen and you attack upward — otherwise the camera has to back
// far off to fit a wide pitch across a narrow screen, leaving the table tiny.
import * as THREE from 'three';

const BASE_TARGET = new THREE.Vector3(0.05, 0, -0.08);
const BASE_VIEW = new THREE.Vector3(0.35, 2.62, 2.8).normalize(); // target → camera, landscape
const MIN_DISTANCE = 3.85;
const PORTRAIT_ASPECT = 0.95;
// World half-extents that must fit: [across the screen, down the screen].
const LANDSCAPE_FIT = [1.85, 1.55];
const PORTRAIT_FIT = [1.2, 1.75]; // pitch turned a quarter: z across, x down

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
    this.portrait = false;
    this.viewDirection = BASE_VIEW.clone();
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.fitToViewport();
  }

  /** Map a landscape-space offset into the current orientation (quarter turn in portrait). */
  orient(target, x, y, z) {
    return this.portrait ? target.set(-z, y, x) : target.set(x, y, z);
  }

  /** Choose orientation, then pull back just far enough to hold the pitch. */
  fitToViewport() {
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.portrait = this.camera.aspect < PORTRAIT_ASPECT;
    const [across, down] = this.portrait ? PORTRAIT_FIT : LANDSCAPE_FIT;
    this.fitDistance = Math.max(MIN_DISTANCE, across / (tanHalf * this.camera.aspect), down / tanHalf);
    this.orient(this.viewDirection, BASE_VIEW.x, BASE_VIEW.y, BASE_VIEW.z);
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
    const { pos, look, tmp, viewDirection } = this;
    this.focus.lerp(this.focusTarget, 1 - Math.exp(-dt * 2.5));

    if (this.mode === 'attract') {
      const yaw = Math.atan2(viewDirection.x, viewDirection.z) + Math.sin(t * 0.09) * 0.55;
      const r = this.fitDistance * 1.04;
      const horizontal = Math.hypot(viewDirection.x, viewDirection.z) * r;
      pos.set(Math.sin(yaw) * horizontal, viewDirection.y * r * (0.86 + Math.sin(t * 0.13) * 0.06), Math.cos(yaw) * horizontal);
      look.set(0, 0, 0);
    } else {
      pos.copy(BASE_TARGET).addScaledVector(viewDirection, this.fitDistance);
      pos.x += Math.sin(t * 0.22) * 0.03;       // slow handheld breathing
      pos.y += Math.sin(t * 0.31 + 1.4) * 0.018;
      look.copy(BASE_TARGET).add(this.focus);

      if (this.intro) {
        const it = this.intro;
        it.t += dt;
        const p = Math.min(1, it.t / it.duration);
        this.orient(tmp, -2.7, 3.9, 1.3).multiplyScalar(this.fitDistance / MIN_DISTANCE); // high, swung to the side
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
          // Close in along the current view, nudged toward the goal that was scored in.
          tmp.copy(BASE_TARGET).addScaledVector(viewDirection, this.fitDistance * 0.49);
          tmp.x += Math.sign(g.x) * 0.6;
          pos.lerp(tmp, w * 0.55);
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
