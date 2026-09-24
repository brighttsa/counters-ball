import { MAX_FLICK_SPEED } from '../core/pitch-dimensions-and-constants.js';
import { flickPreview } from './flick-vector-contact-preview.js';
import { projectedFlickWidth } from './flick-vector-projected-width.js';
import * as THREE from 'three';
import { createFlickMeshes, shapeRibbon, IVORY, GOLD } from './flick-vector-meshes.js';

const IVORY_TINT = new THREE.Color(IVORY), FULL_GOLD = new THREE.Color(GOLD), GOLD_TINT = new THREE.Color();

const preference = query => globalThis.matchMedia?.(query)?.matches ?? false;

export class AimVisuals {
  constructor(parent, { camera, canvas, physics } = {}) {
    Object.assign(this, { camera, canvas, physics }, createFlickMeshes(parent));
    this.activeBody = this.hoverBody = null;
    this.pull = { x: 0, y: 0 };
    this.power = this.effectAge = this.effectDuration = 0;
    this.elapsed = 0;
    this.disposed = false;
  }

  show(body, pull) {
    if (this.disposed) return;
    this.activeBody = body;
    this.pull = { x: pull.x, y: pull.y };
    this.draw();
  }

  draw() {
    const body = this.activeBody;
    const preview = flickPreview(body, this.pull, this.physics?.bodies);
    const { power, direction, range, contact } = preview;
    this.power = power;
    this.preview = preview;
    this.ring.visible = true;
    this.glow.visible = false;
    this.ring.position.set(body.pos.x, 0.012, body.pos.y);
    this.ring.scale.setScalar(body.radius);
    // Power warms the ring and the band together from ivory to gold, instead of a separate gold strip.
    const tint = GOLD_TINT.copy(IVORY_TINT).lerp(FULL_GOLD, power * 0.75);
    this.ring.material.color.copy(tint);
    for (const mesh of [this.ribbon, this.ribbonShadow, this.ghost, this.ghostFill]) mesh.visible = false;
    if (power < 0.02) return;
    const angle = -Math.atan2(direction.y, direction.x);
    const width = projectedFlickWidth(this.camera, this.canvas, body.pos, direction, power,
      preference('(pointer: coarse)') || (this.canvas?.getBoundingClientRect?.().width ?? 1000) < 600)
      * (power > 0.95 && !preference('(prefers-reduced-motion: reduce)') ? 1 + Math.sin(this.elapsed * 5) * 0.025 : 1);
    const distance = Math.max(0.42 + power * 0.65, Math.min(1.35, contact?.distance ?? range));
    const start = body.radius * 1.7; // the band grows out of the ring's outer edge, no gap
    const length = Math.max(0, distance - start);
    const head = Math.min(length * 0.42, width * 1.5);
    for (const [mesh, scale, y] of [[this.ribbonShadow, 1.2, 0.028], [this.ribbon, 1, 0.034]]) {
      shapeRibbon(mesh, length, width * scale, start, head);
      mesh.position.set(body.pos.x, y, body.pos.y);
      mesh.rotation.y = angle;
      mesh.visible = length > 0.008;
    }
    this.ribbon.material.color.copy(tint);
    if (contact) {
      for (const mesh of [this.ghost, this.ghostFill]) {
        mesh.visible = true;
        mesh.position.set(contact.position.x, 0.018, contact.position.y);
        mesh.scale.setScalar(body.radius);
      }
      this.ghost.material.color.copy(IVORY_TINT).lerp(FULL_GOLD, contact.alignment);
      this.ghost.material.opacity = 0.3 + contact.alignment * 0.35;
      if (contact.kind === 'wall') {
        this.ghost.position.set(contact.position.x - contact.normal.x * body.radius, 0.018,
          contact.position.y - contact.normal.y * body.radius);
        this.ghost.scale.set(body.radius * 1.6, body.radius * 0.22, 1);
        this.ghost.rotation.z = Math.atan2(contact.normal.y, contact.normal.x) + Math.PI / 2;
        this.ghostFill.visible = false;
      } else {
        this.ghost.rotation.z = 0;
        if (contact.distance < 0.01) this.ghost.material.color.set(0xa86b60);
      }
    }
  }

  hide() {
    this.activeBody = this.hoverBody = null;
    for (const mesh of this.group.children) mesh.visible = false;
    this.effectDuration = 0;
    this.preview = null;
  }

  hover(body) {
    if (this.disposed) return;
    this.hoverBody = body;
    if (!body && !this.activeBody) this.glow.visible = false;
  }

  release(body, velocity) {
    this.hide();
    if (this.disposed) return;
    const speed = Math.hypot(velocity.x, velocity.y);
    if (!speed) return;
    this.effectAge = 0;
    this.effectRadius = body.radius;
    this.effectDuration = preference('(prefers-reduced-motion: reduce)') ? 0.08 : 0.18;
    this.flash.position.set(body.pos.x, 0.025, body.pos.y);
    this.flash.scale.setScalar(body.radius);
    this.flash.material.opacity = 0.65;
    this.flash.visible = true;
    shapeRibbon(this.scrape, 0.12 + Math.min(1, speed / MAX_FLICK_SPEED) * 0.2, body.radius * 0.55);
    this.scrape.position.set(body.pos.x, 0.023, body.pos.y);
    this.scrape.rotation.y = Math.PI - Math.atan2(velocity.y, velocity.x);
    this.scrape.material.opacity = 0.5;
    this.scrape.visible = this.effectDuration > 0.08;
  }

  update(t, dt = 0) {
    if (this.disposed) return;
    this.elapsed += Math.max(0, dt);
    if (this.activeBody) this.draw();
    else if (this.hoverBody) {
      this.glow.visible = true;
      this.glow.position.set(this.hoverBody.pos.x, 0.012, this.hoverBody.pos.y);
      this.glow.scale.setScalar(this.hoverBody.radius);
      this.glow.material.opacity = 0.2;
    }
    if (!this.effectDuration) return;
    this.effectAge += Math.max(0, dt);
    const progress = Math.min(1, this.effectAge / this.effectDuration);
    this.flash.scale.setScalar(this.effectRadius * (1 + (this.effectDuration > 0.08 ? progress * 0.9 : 0)));
    this.flash.material.opacity = (1 - progress) * 0.65;
    this.scrape.material.opacity = (1 - progress) ** 2 * 0.5;
    if (progress === 1) {
      this.flash.visible = this.scrape.visible = false;
      this.effectDuration = 0;
    }
  }

  dispose() {
    if (this.disposed) return;
    this.hide();
    this.disposed = true;
    this.group.removeFromParent();
    this.group.traverse(mesh => { mesh.geometry?.dispose(); mesh.material?.dispose(); });
  }
}
