import * as THREE from 'three';

// Only scenery wholly outside the playable envelope can disappear. Mechanics,
// rails, goals and pieces remain visible and keep their physical state.
export class PlayerCameraOcclusion {
  constructor(stage) {
    this.hidden = new Set(); this.scenery = [];
    stage.group.updateMatrixWorld(true);
    stage.group.traverse(mesh => {
      if (!mesh.isMesh || !mesh.visible || mesh.material?.transparent) return;
      const box = new THREE.Box3().setFromObject(mesh);
      if (box.max.y < .12) return;
      if (box.max.x < -2.3 || box.min.x > 2.3 || box.max.z < -1.5 || box.min.z > 1.5)
        this.scenery.push({ mesh, box });
    });
    this.ray = new THREE.Ray(); this.hit = new THREE.Vector3(); this.direction = new THREE.Vector3();
  }
  restore() { for (const mesh of this.hidden) mesh.visible = true; this.hidden.clear(); }
  update(camera, targets) {
    this.restore();
    for (const { mesh, box } of this.scenery) {
      const blocked = box.containsPoint(camera.position) || targets.some(target => {
        const distance = this.direction.subVectors(target, camera.position).length();
        this.ray.set(camera.position, this.direction.normalize());
        return this.ray.intersectBox(box, this.hit) && this.hit.distanceTo(camera.position) < distance - .05;
      });
      if (blocked) { mesh.visible = false; this.hidden.add(mesh); }
    }
  }
}
