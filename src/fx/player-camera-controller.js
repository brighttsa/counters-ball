import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CAMERA_MODES, CAMERA_PREFERENCE_KEY, CAMERA_GLIDE_RATE, CAMERA_SNAP_RATE, cameraTransitionBlend,
  loadCameraPreferences, playerCameraPose, overviewPose } from './player-camera-view-poses.js';
import { PlayerCameraOcclusion } from './player-camera-occlusion.js';
import { createPlayerCameraControls } from '../ui/player-camera-controls.js';

export class PlayerCameraController {
  constructor(app, director) {
    Object.assign(this, { app, director, camera: director.camera, mode: 'broadcast', peeking: false, rate: CAMERA_SNAP_RATE });
    try { this.storage = window.localStorage; } catch { this.storage = null; }
    this.preferences = loadCameraPreferences(this.storage);
    this.freePositions = {};
    this.ui = createPlayerCameraControls(this);
    this.orbitCamera = this.camera.clone();
    this.controls = new OrbitControls(this.orbitCamera, this.ui.pad);
    Object.assign(this.controls, { enablePan: false, enableDamping: false, enabled: false,
      minPolarAngle: .15, maxPolarAngle: 1.18, rotateSpeed: .45 });
    this.controls.addEventListener('start', () => this.cancelAim());
    this.target = new THREE.Vector3(); this.poseRotation = new THREE.Quaternion();
    director.playerControl = this;
  }

  get active() {
    const s = this.app.session;
    return s && !s.options.isAttract && !s.options.isPreview && !this.director.replay && this.director.mode === 'play';
  }
  owner() {
    const s = this.app.session;
    return s.options.controllers.home === 'human' && s.options.controllers.away === 'human' ? s.rules.turn : 'home';
  }
  poseFor(mode) {
    return playerCameraPose(this.camera, mode, this.session, this.selected, this.owner());
  }
  cancelAim() {
    const input = this.app.session?.input;
    if (!input?.selected) return;
    this.selected = input.selected;
    input.cancel();
    this.ui.notice('Aim cancelled. No flick used.');
  }
  resetOrbit() {
    const pose = overviewPose(this.camera, this.session);
    const distance = pose.position.distanceTo(pose.target);
    this.controls.minDistance = Math.max(3.2, distance * .72);
    this.controls.maxDistance = distance * 1.5;
    this.orbitCamera.position.copy(pose.position).sub(pose.target);
    this.controls.target.set(0, 0, 0); this.controls.update();
    this.ui.root.querySelector('#camera-zoom').value = String(
      100 * (this.controls.maxDistance - distance) / (this.controls.maxDistance - this.controls.minDistance));
  }
  select(mode, save = true) {
    if (!CAMERA_MODES.includes(mode) || !this.active) return;
    this.cancelAim(); this.peeking = false; this.mode = mode;
    this.director.goal = null;
    this.pose = this.poseFor(mode); this.rate = CAMERA_SNAP_RATE;
    if (save) {
      this.ui.announce?.(mode);
      this.preferences[this.owner()] = mode;
      try { this.storage?.setItem(CAMERA_PREFERENCE_KEY, JSON.stringify(this.preferences)); } catch { /* storage is optional */ }
    }
    this.ui.sync(mode, true);
  }
  cycle() {
    const presets = CAMERA_MODES.slice(0, 3);
    this.select(presets[(presets.indexOf(this.mode) + 1) % presets.length]);
  }
  peek(active) {
    if (!this.active || this.peeking === active) return;
    this.cancelAim(); this.peeking = active;
    this.pose = this.poseFor(active ? 'tactical' : this.mode); this.rate = CAMERA_SNAP_RATE;
  }
  reset() {
    if (!this.active) return;
    this.selected = null; this.resetOrbit(); this.select('broadcast'); this.ui.notice('Camera reset.');
  }
  orbit(yaw, polar) {
    if (this.mode !== 'free' || !this.active) return;
    this.cancelAim();
    const sphere = new THREE.Spherical().setFromVector3(this.orbitCamera.position);
    sphere.theta += yaw;
    sphere.phi = THREE.MathUtils.clamp(sphere.phi + polar, this.controls.minPolarAngle, this.controls.maxPolarAngle);
    this.orbitCamera.position.setFromSpherical(sphere); this.controls.update();
  }
  zoom(amount) {
    if (this.mode !== 'free' || !this.active) return;
    this.cancelAim();
    this.orbitCamera.position.setLength(THREE.MathUtils.lerp(this.controls.maxDistance, this.controls.minDistance, amount));
    this.controls.update();
  }
  update(dt) {
    const now = performance.now();
    // Simulation dt is capped; hidden previews need real elapsed time to finish a camera switch.
    const cameraDt = this.lastCameraUpdateAt == null ? dt : Math.max(dt, (now - this.lastCameraUpdateAt) / 1000);
    this.lastCameraUpdateAt = now;
    const s = this.app.session;
    if (s !== this.session) {
      this.occlusion?.restore(); this.session = s; this.selected = null; this.peeking = false;
      this.side = null; this.aspect = null; this.pose = null; this.freePositions = {};
      this.occlusion = s ? new PlayerCameraOcclusion(s.stage) : null;
      if (s) this.resetOrbit();
    }
    this.ui.root.hidden = !this.active;
    this.controls.enabled = Boolean(this.active && this.mode === 'free' && !this.peeking);
    if (!this.active) { this.occlusion?.restore(); this.wasActive = false; return false; }
    // Coming back from the kick-off intro, a replay or a goal camera: glide back rather than cut.
    if (!this.wasActive) { this.wasActive = true; this.rate = CAMERA_GLIDE_RATE; }
    const side = this.owner();
    if (this.side !== side) {
      if (this.side) this.freePositions[this.side] = this.orbitCamera.position.clone();
      this.resetOrbit();
      if (this.freePositions[side]) { this.orbitCamera.position.copy(this.freePositions[side]); this.controls.update(); }
      this.side = side; this.selected = null; this.select(this.preferences[side], false);
      this.rate = CAMERA_GLIDE_RATE; // 2-Player hand-over: the view turns to the next player gently
    }
    if (this.aspect !== this.camera.aspect) {
      this.aspect = this.camera.aspect; this.cancelAim(); this.resetOrbit();
      this.pose = this.poseFor(this.peeking ? 'tactical' : this.mode);
    }
    if (this.director.aimLocked) return true;
    // Street stays behind the viewer's own caps: it holds still through the opponent's turn and
    // reframes to the new resting arrangement only when the viewer's turn begins, gliding there.
    // It never moves under a held flick.
    if (this.mode === 'street' && !this.peeking && s.rules.phase === 'aiming' && s.rules.turn === side) {
      const key = [s.rules.turn, s.ballBody.pos.x, s.ballBody.pos.y,
        ...s.entries.flatMap(e => [e.body.pos.x, e.body.pos.y]),
        s.physics.goalCenters?.[1], s.physics.goalCenters?.[-1]].join(',');
      if (key !== this.streetArrangement) {
        if (this.streetArrangement) this.rate = CAMERA_GLIDE_RATE;
        this.streetArrangement = key;
        this.pose = this.poseFor('street');
      }
    }
    if (this.mode === 'free' && !this.peeking) {
      this.controls.update();
      this.pose = { position: this.orbitCamera.position, target: this.controls.target };
    }
    const blend = cameraTransitionBlend(cameraDt, this.director.motionEnabled, this.rate);
    this.camera.position.lerp(this.pose.position, blend);
    this.target.lerp(this.pose.target, blend);
    this.camera.fov = 42; this.camera.updateProjectionMatrix();
    this.poseRotation.copy(this.camera.quaternion);
    this.camera.lookAt(this.target); this.camera.quaternion.slerp(this.poseRotation, 1 - blend);
    this.camera.updateMatrixWorld(true);
    // Once a glide has arrived, the next move responds at full speed again.
    if (this.camera.position.distanceTo(this.pose.position) < .005) this.rate = CAMERA_SNAP_RATE;
    this.director.focusDistance = this.camera.position.distanceTo(this.target);
    if (this.director.scene.fog) {
      this.director.scene.fog.near = this.director.focusDistance + this.director.fogRange[0];
      this.director.scene.fog.far = this.director.focusDistance + this.director.fogRange[1];
    }
    this.occlusion.update(this.camera, [this.target, new THREE.Vector3(s.ballBody.pos.x, .04, s.ballBody.pos.y),
      ...s.entries.map(e => new THREE.Vector3(e.body.pos.x, .05, e.body.pos.y))]);
    return true;
  }
}
