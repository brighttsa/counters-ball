import * as THREE from 'three';

export const IVORY = 0xfdf6e6, GOLD = 0xdfb94f;
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

// Reusable vertices form a thick tapered shaft (full width at the cap, 62% at
// the neck) and a broad arrowhead twice the shaft's starting width.
export function shapeRibbon(mesh, length, width, start = 0, head = Math.min(length * 0.42, width * 1.5)) {
  const neck = start + length - head;
  const points = [[start, -width * 0.5], [start, width * 0.5],
    [neck, -width * 0.31], [neck, width * 0.31],
    [neck, -width], [neck, width], [start + length, 0]];
  const attribute = mesh.geometry.attributes.position;
  points.forEach(([x, z], i) => attribute.setXYZ(i, x, 0, z));
  attribute.needsUpdate = true;
}

// The aim is one light, see-through piece: a ring round the chosen cap and a single band that grows
// straight out of it, so nothing reads as separate dashes or stripes. The table and the pieces stay
// visible through it, and the dark outline underneath is only a faint lift off the surface.
export function createFlickMeshes(parent) {
  const group = new THREE.Group();
  const ring = flatRing(1.25, 1.7, IVORY, 0.92);
  // A faint dark outline under the band keeps it readable on pale cardboard and in sunlight.
  const ribbonShadow = ribbonMesh(0x241c14, 0.34);
  const glow = flatRing(1.02, 2.1, GOLD, 0.14); // hover only: which cap you can pick up
  const ribbon = ribbonMesh(IVORY, 0.72);
  const ghost = flatRing(0.84, 1, GOLD, 0.55);
  const ghostFill = new THREE.Mesh(new THREE.CircleGeometry(1, 48), flatMaterial(IVORY, 0.12));
  ghostFill.rotation.x = -Math.PI / 2;
  const flash = flatRing(1.15, 1.65, GOLD, 0);
  const scrape = ribbonMesh(IVORY, 0);
  const meshes = { ribbonShadow, ring, glow, ribbon, ghost, ghostFill, flash, scrape };
  Object.values(meshes).forEach((mesh, i) => {
    mesh.visible = false;
    mesh.renderOrder = 20 + i;
    group.add(mesh);
  });
  ribbon.renderOrder = 26;
  parent.add(group);
  return { group, ...meshes };
}
