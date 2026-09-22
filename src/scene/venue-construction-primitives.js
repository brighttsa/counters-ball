import * as THREE from 'three';

export function material(color, metalness = 0, roughness = 0.85) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

export function box(group, size, position, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function rod(group, start, end, radius, mat, square = false) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const length = a.distanceTo(b);
  const geometry = square ? new THREE.BoxGeometry(radius * 2, length, radius * 2)
    : new THREE.CylinderGeometry(radius, radius, length, 8);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
