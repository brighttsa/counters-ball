import * as THREE from 'three';

export const IVORY = 0xfdf6e6, GOLD = 0xdfb94f, ENAMEL = 0xa83b2a;
export function flatMaterial(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, opacity, transparent: true,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
}

export function flatRing(inner, outer, color, opacity) {
  const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 64), flatMaterial(color, opacity));
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function ribbonMesh(color, opacity) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(21), 3));
  geometry.setIndex([0, 1, 2, 1, 3, 2, 4, 5, 6]);
  const mesh = new THREE.Mesh(geometry, flatMaterial(color, opacity));
  mesh.frustumCulled = false;
  return mesh;
}

// Reusable vertices form a tapered shaft and a broad triangular head.
export function shapeRibbon(mesh, length, width, start = 0, head = Math.min(length * 0.45, width * 1.65)) {
  const neck = start + length - head;
  const points = [[start, -width * 0.5], [start, width * 0.5],
    [neck, -width * 0.28], [neck, width * 0.28],
    [neck, -width * 0.92], [neck, width * 0.92], [start + length, 0]];
  const attribute = mesh.geometry.attributes.position;
  points.forEach(([x, z], i) => attribute.setXYZ(i, x, 0, z));
  attribute.needsUpdate = true;
}

export function createFlickMeshes(parent) {
  const group = new THREE.Group();
  const ring = flatRing(1.28, 1.67, IVORY, 0.8);
  const ringShadow = flatRing(1.22, 1.76, 0x3a3024, 0.35);
  const ribbonShadow = ribbonMesh(0x3a3024, 0.3);
  const glow = flatRing(1.02, 2.05, GOLD, 0.18);
  const notch = ribbonMesh(GOLD, 0.95);
  const ribbon = ribbonMesh(IVORY, 0.88);
  const core = ribbonMesh(GOLD, 0.85);
  const edge = ribbonMesh(ENAMEL, 0.8);
  const ghost = flatRing(0.84, 1, GOLD, 0.7);
  const ghostFill = new THREE.Mesh(new THREE.CircleGeometry(1, 48), flatMaterial(IVORY, 0.12));
  ghostFill.rotation.x = -Math.PI / 2;
  const flash = flatRing(1.15, 1.65, GOLD, 0);
  const scrape = ribbonMesh(IVORY, 0);
  const meshes = { ringShadow, ribbonShadow, ring, glow, notch, ribbon, core, edge, ghost, ghostFill, flash, scrape };
  Object.values(meshes).forEach((mesh, i) => {
    mesh.visible = false;
    mesh.renderOrder = 20 + i;
    group.add(mesh);
  });
  edge.renderOrder = 25; ribbon.renderOrder = 26; core.renderOrder = 27;
  parent.add(group);
  return { group, ...meshes };
}
