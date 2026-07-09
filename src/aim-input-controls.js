// Drag-to-flick aiming: raycast-select a cap of the team in turn, pull back,
// see a curved trajectory line + subtle rim glow, release to flick.
import * as THREE from 'three';

const MAX_PULL = 0.85;      // world units of drag for full power
const MAX_FLICK_SPEED = 3.4;

export class AimInputControls {
  /**
   * @param {object} deps { camera, domElement, capEntries, onFlick, canAim }
   *   capEntries: [{ mesh, body, team }] — body is the physics body
   *   onFlick(body, velocity: THREE.Vector2)
   *   canAim(team) => boolean — main.js gates by turn + rest + celebration
   */
  constructor({ camera, domElement, scene, capEntries, onFlick, canAim }) {
    this.camera = camera;
    this.dom = domElement;
    this.capEntries = capEntries;
    this.onFlick = onFlick;
    this.canAim = canAim;
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.selected = null;
    this.aimVector = new THREE.Vector2(); // direction * power, world xz

    // Curved dashed trajectory line, warm chalk-white.
    this.lineGeo = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 25 }, () => new THREE.Vector3()));
    this.line = new THREE.Line(this.lineGeo, new THREE.LineDashedMaterial({
      color: 0xfff1cf, dashSize: 0.045, gapSize: 0.03,
      transparent: true, opacity: 0, depthWrite: false,
    }));
    this.line.frustumCulled = false;
    scene.add(this.line);

    // Rim glow ring under the selected cap — additive so it reads as light.
    this.glow = new THREE.Mesh(
      new THREE.RingGeometry(1.02, 1.42, 40),
      new THREE.MeshBasicMaterial({ color: 0xffd07a, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.glow.rotation.x = -Math.PI / 2;
    scene.add(this.glow);

    this.pointerId = null; // the one pointer allowed to drive the drag
    domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
    domElement.addEventListener('pointerup', (e) => this.onPointerUp(e));
    domElement.addEventListener('pointercancel', (e) => this.onPointerUp(e));
  }

  ownsEvent(e) {
    return this.selected && (this.pointerId === null || e.pointerId === this.pointerId);
  }

  pointToGround(e) {
    const rect = this.dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.groundPlane, hit) ? hit : null;
  }

  onPointerDown(e) {
    if (this.selected) return; // a second finger must not hijack the drag
    const rect = this.dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const meshes = this.capEntries.map((c) => c.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (!hits.length) return;
    const entry = this.capEntries[meshes.indexOf(hits[0].object)];
    if (!this.canAim(entry.team)) return;
    this.selected = entry;
    this.pointerId = e.pointerId;
    try { this.dom.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    this.aimVector.set(0, 0);
    this.dom.classList.add('aiming');
  }

  onPointerMove(e) {
    if (!this.ownsEvent(e)) return;
    const hit = this.pointToGround(e);
    if (!hit) return;
    const capPos = this.selected.body.pos;
    // Slingshot: pull back behind the cap; flick fires the opposite way.
    this.aimVector.set(capPos.x - hit.x, capPos.y - hit.z);
    const len = this.aimVector.length();
    if (len > MAX_PULL) this.aimVector.multiplyScalar(MAX_PULL / len);
    this.updateTrajectoryLine();
  }

  onPointerUp(e) {
    if (!this.ownsEvent(e)) return;
    this.pointerId = null;
    const power = this.aimVector.length() / MAX_PULL;
    if (power > 0.06) {
      const vel = this.aimVector.clone().normalize()
        .multiplyScalar(power * MAX_FLICK_SPEED);
      this.onFlick(this.selected.body, vel);
    }
    this.selected = null;
    this.line.material.opacity = 0;
    this.dom.classList.remove('aiming');
  }

  updateTrajectoryLine() {
    const body = this.selected.body;
    const power = this.aimVector.length() / MAX_PULL;
    const dir = this.aimVector.clone().normalize();
    const len = 0.22 + power * 1.05;
    const side = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(len * 0.07);
    const start = new THREE.Vector3(body.pos.x, 0.035, body.pos.y);
    const mid = new THREE.Vector3(
      body.pos.x + dir.x * len * 0.5 + side.x, 0.035,
      body.pos.y + dir.y * len * 0.5 + side.y);
    const end = new THREE.Vector3(body.pos.x + dir.x * len, 0.035, body.pos.y + dir.y * len);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    this.lineGeo.setFromPoints(curve.getPoints(24));
    this.line.computeLineDistances();
    this.line.material.opacity = 0.25 + power * 0.65;
  }

  /** Per-frame: pulse the rim glow around the selected cap. */
  update(t) {
    if (this.selected) {
      const b = this.selected.body;
      const r = this.selected.body.radius;
      this.glow.position.set(b.pos.x, 0.004, b.pos.y);
      this.glow.scale.setScalar(r);
      this.glow.material.opacity = 0.35 + Math.sin(t * 6) * 0.15
        + (this.aimVector.length() / MAX_PULL) * 0.3;
    } else {
      this.glow.material.opacity *= 0.85;
    }
  }
}
