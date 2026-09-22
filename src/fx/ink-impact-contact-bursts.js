import * as THREE from 'three';

export class InkImpactBursts {
  constructor(parent) {
    const shape = new THREE.Shape();
    shape.moveTo(-.1, -.018); shape.lineTo(.12, 0); shape.lineTo(-.06, .022); shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    this.next = 0;
    this.bits = Array.from({ length: 24 }, (_, i) => {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color: i % 3 ? 0xf5f1df : 0xe5c446, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      }));
      mesh.rotation.x = -Math.PI / 2; mesh.visible = false; mesh.renderOrder = 20;
      parent.add(mesh); return { mesh, life: 0, duration: .18, dx: 0, dz: 0 };
    });
  }

  burst(x, z, strength, direction = null) {
    if (strength < .28 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const count = direction ? 3 : 6;
    const angle = direction ? Math.atan2(direction.y, direction.x) : 0;
    for (let i = 0; i < count; i++) {
      const bit = this.bits[this.next++ % this.bits.length];
      const a = direction ? angle + (i - 1) * .14 : i * Math.PI / 3 + .2;
      Object.assign(bit, { life: .18, dx: Math.cos(a), dz: Math.sin(a) });
      bit.mesh.position.set(x + bit.dx * .1, .055, z + bit.dz * .1);
      bit.mesh.rotation.z = -a; bit.mesh.scale.setScalar(.45 + strength * .8);
      bit.mesh.material.opacity = .9; bit.mesh.visible = true;
    }
  }

  update(dt) {
    for (const bit of this.bits) {
      if (bit.life <= 0) continue;
      bit.life = Math.max(0, bit.life - dt);
      bit.mesh.visible = bit.life > 0;
      bit.mesh.position.x += bit.dx * dt * .7;
      bit.mesh.position.z += bit.dz * dt * .7;
      bit.mesh.material.opacity = bit.life / bit.duration;
    }
  }
}
