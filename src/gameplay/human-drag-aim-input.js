// Slingshot drag input for human players: hover highlights a flickable cap,
// press grabs it, pulling back aims (trajectory + power ring + cap lean),
// release flicks. One pointer drives a drag; extra touches are ignored.
// The keyboard alternative (KeyboardFlickAim) drives this same selection and pull.
import * as THREE from 'three';
import { MAX_PULL, MAX_FLICK_SPEED } from '../core/pitch-dimensions-and-constants.js';
import { FlickGestureSampler } from './flick-gesture-sampler.js';
import { chooseTouchCap } from './touch-cap-selection.js';
import { KeyboardFlickAim } from './keyboard-flick-aim.js';

const MIN_FLICK_POWER = 0.06;

export class HumanDragAimInput {
  /**
   * @param deps { camera, domElement, visuals, juice, ballBody, canControl(side), onFlick(entry, velocity), onAimStart?(entry) }
   */
  constructor(deps) {
    Object.assign(this, deps);
    this.entries = [];
    this.selected = null;
    this.pointerId = null;
    this.pull = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.hit = new THREE.Vector3();
    this.dragStart = new THREE.Vector2();
    this.projected = new THREE.Vector3();
    this.dragCamera = this.camera.clone();
    this.gesture = new FlickGestureSampler();
    if (typeof document !== 'undefined') {
      this.selectionNotice = document.createElement('output');
      this.selectionNotice.className = 'touch-selection-status';
      this.selectionNotice.setAttribute('aria-live', 'polite');
      document.body.append(this.selectionNotice);
    }

    this.listeners = {
      pointerdown: (e) => this.onDown(e),
      pointermove: (e) => this.onMove(e),
      pointerup: (e) => this.onUp(e),
      pointercancel: (e) => this.onCancel(e),
      lostpointercapture: (e) => this.onCancel(e),
    };
    for (const [type, fn] of Object.entries(this.listeners)) this.domElement.addEventListener(type, fn);
    this.cancelGesture = () => this.cancel();
    window.addEventListener('blur', this.cancelGesture);
    window.addEventListener('resize', this.cancelGesture);
    this.keyboard = new KeyboardFlickAim(this);
  }

  setEntries(entries) {
    this.entries = entries;
  }

  aimRay(e) {
    const rect = this.domElement.getBoundingClientRect();
    this.ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.selected ? this.dragCamera : this.camera);
  }

  pickEntry(e) {
    this.aimRay(e);
    const meshes = this.entries.map((entry) => entry.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    const direct = hits.length ? this.entries[meshes.indexOf(hits[0].object)] : null;
    if (e.pointerType !== 'touch') return direct;
    if (direct && !this.canControl(direct.side)) return null;
    const rect = this.domElement.getBoundingClientRect();
    const candidates = [];
    for (const entry of this.entries) {
      if (!this.canControl(entry.side)) continue;
      entry.mesh.getWorldPosition(this.projected).project(this.camera);
      if (this.projected.z < -1 || this.projected.z > 1) continue;
      const x = rect.left + (this.projected.x + 1) * rect.width / 2;
      const y = rect.top + (1 - this.projected.y) * rect.height / 2;
      const d = Math.hypot(x - e.clientX, y - e.clientY);
      candidates.push({ entry, distance: d });
    }
    const choice = chooseTouchCap(candidates);
    if (this.selectionNotice) this.selectionNotice.textContent = choice.ambiguous ? 'Selection unclear' : '';
    return choice.entry;
  }

  onDown(e) {
    if (this.keyboard.aiming && e.button === 0) this.cancel(); // a click takes over from the keyboard
    if (this.selected || e.button !== 0) return; // a second finger must not hijack the drag
    if (this.selectionNotice) this.selectionNotice.textContent = '';
    const entry = this.pickEntry(e);
    if (!entry || !this.canControl(entry.side)) return;
    this.dragCamera.copy(this.camera);
    this.aimRay(e);
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, this.hit)) return;
    this.dragStart.set(this.hit.x, this.hit.z);
    this.gesture.reset(this.hit.x, this.hit.z, e.timeStamp);
    this.selected = entry;
    this.pointerId = e.pointerId;
    try { this.domElement.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    this.pull.set(0, 0);
    this.domElement.classList.add('aiming');
    this.visuals.show(entry.body, this.pull);
    if (this.selectionNotice && e.pointerType === 'touch') this.selectionNotice.textContent = 'Cap selected';
    this.onAimStart?.(entry);
  }

  onMove(e) {
    if (!this.selected) {
      if (e.pointerType === 'touch') return;
      const entry = this.pickEntry(e);
      const grabbable = entry && this.canControl(entry.side) ? entry : null;
      this.visuals.hover(grabbable?.body ?? null);
      this.domElement.classList.toggle('can-grab', Boolean(grabbable));
      return;
    }
    if (e.pointerId !== this.pointerId) return;
    this.aimRay(e);
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, this.hit)) return;
    this.gesture.add(this.hit.x, this.hit.z, e.timeStamp);
    // Freeze projection for the gesture so camera breathing cannot change its power.
    this.pull.set(this.dragStart.x - this.hit.x, this.dragStart.y - this.hit.z);
    const len = this.pull.length();
    if (len > MAX_PULL) this.pull.multiplyScalar(MAX_PULL / len);
    this.visuals.show(this.selected.body, this.pull);
    this.juice.press(this.selected, this.pull, this.pull.length() / MAX_PULL);
  }

  onUp(e) {
    if (!this.selected || e.pointerId !== this.pointerId) return;
    this.onMove(e);
    const entry = this.selected;
    const power = this.pull.length() / MAX_PULL;
    const gesture = this.gesture.measure(this.pull);
    const velocity = power > MIN_FLICK_POWER
      ? this.pull.clone().normalize().multiplyScalar(Math.min(1, power * gesture.boost) * MAX_FLICK_SPEED) : null;
    this.clearSelection();
    if (velocity) this.onFlick(entry, velocity, gesture);
    else this.juice.release(entry, 0);
  }

  onCancel(e) {
    if (e.pointerId === this.pointerId) this.cancel();
  }

  /** Drop any in-progress drag (pause, quit, turn change). */
  cancel() {
    if (this.selected) this.juice.release(this.selected, 0);
    this.clearSelection();
    this.visuals.hover(null);
  }

  clearSelection() {
    const wasAiming = Boolean(this.selected);
    this.keyboard.stop();
    const pointerId = this.pointerId;
    this.selected = null;
    this.pointerId = null;
    if (pointerId !== null && this.domElement.hasPointerCapture(pointerId)) {
      this.domElement.releasePointerCapture(pointerId);
    }
    this.visuals.hide();
    if (this.selectionNotice) this.selectionNotice.textContent = '';
    this.domElement.classList.remove('aiming');
    if (wasAiming) this.onAimEnd?.();
  }

  dispose() {
    this.cancel();
    this.domElement.classList.remove('can-grab');
    for (const [type, fn] of Object.entries(this.listeners)) this.domElement.removeEventListener(type, fn);
    window.removeEventListener('blur', this.cancelGesture);
    window.removeEventListener('resize', this.cancelGesture);
    this.selectionNotice?.remove();
    this.keyboard.dispose();
  }
}
