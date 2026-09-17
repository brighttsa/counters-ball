// Slingshot drag input for human players: hover highlights a flickable cap,
// press grabs it, pulling back aims (trajectory + power ring + cap lean),
// release flicks. One pointer drives a drag; extra touches are ignored.
import * as THREE from 'three';
import { MAX_PULL, MAX_FLICK_SPEED } from '../core/pitch-dimensions-and-constants.js';

const MIN_FLICK_POWER = 0.06;

export class HumanDragAimInput {
  /**
   * @param deps { camera, domElement, visuals, juice, canControl(side), onFlick(entry, velocity), onAimStart?(entry) }
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

    this.listeners = {
      pointerdown: (e) => this.onDown(e),
      pointermove: (e) => this.onMove(e),
      pointerup: (e) => this.onUp(e),
      pointercancel: (e) => this.onUp(e),
    };
    for (const [type, fn] of Object.entries(this.listeners)) this.domElement.addEventListener(type, fn);
  }

  setEntries(entries) {
    this.entries = entries;
  }

  aimRay(e) {
    const rect = this.domElement.getBoundingClientRect();
    this.ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
  }

  pickEntry(e) {
    this.aimRay(e);
    const meshes = this.entries.map((entry) => entry.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    return hits.length ? this.entries[meshes.indexOf(hits[0].object)] : null;
  }

  onDown(e) {
    if (this.selected) return; // a second finger must not hijack the drag
    const entry = this.pickEntry(e);
    if (!entry || !this.canControl(entry.side)) return;
    this.selected = entry;
    this.pointerId = e.pointerId;
    try { this.domElement.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    this.pull.set(0, 0);
    this.domElement.classList.add('aiming');
    this.visuals.show(entry.body, this.pull);
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
    const cap = this.selected.body.pos;
    this.pull.set(cap.x - this.hit.x, cap.y - this.hit.z); // pull back, flick forward
    const len = this.pull.length();
    if (len > MAX_PULL) this.pull.multiplyScalar(MAX_PULL / len);
    this.visuals.show(this.selected.body, this.pull);
    this.juice.press(this.selected, this.pull, this.pull.length() / MAX_PULL);
  }

  onUp(e) {
    if (!this.selected || e.pointerId !== this.pointerId) return;
    const entry = this.selected;
    const power = this.pull.length() / MAX_PULL;
    const velocity = power > MIN_FLICK_POWER
      ? this.pull.clone().normalize().multiplyScalar(power * MAX_FLICK_SPEED) : null;
    this.clearSelection();
    if (velocity) this.onFlick(entry, velocity);
    else this.juice.release(entry, 0);
  }

  /** Drop any in-progress drag (pause, quit, turn change). */
  cancel() {
    if (this.selected) this.juice.release(this.selected, 0);
    this.clearSelection();
    this.visuals.hover(null);
  }

  clearSelection() {
    this.selected = null;
    this.pointerId = null;
    this.visuals.hide();
    this.domElement.classList.remove('aiming');
  }

  dispose() {
    this.cancel();
    this.domElement.classList.remove('can-grab');
    for (const [type, fn] of Object.entries(this.listeners)) this.domElement.removeEventListener(type, fn);
  }
}
