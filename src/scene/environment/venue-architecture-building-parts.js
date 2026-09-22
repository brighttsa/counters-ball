import * as THREE from 'three';

export const finish = (color, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness: metalness ? 0.72 : 0.94, metalness });

export function block(parent, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function rod(parent, from, to, radius, material) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 8), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function wire(parent, from, to, sag, material) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const middle = a.clone().lerp(b, 0.5); middle.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(a, middle, b);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.025, 5, false), material);
  parent.add(mesh);
  return mesh;
}

// A thin folded sheet reads as roofing at cap scale without a solid box canopy.
export function roof(parent, rng, { x = 0, y, z, width, depth, color, slope = 0.12 }) {
  const geometry = new THREE.PlaneGeometry(width, depth, Math.ceil(width * 6), 2);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setZ(i, Math.cos(p.getX(i) * Math.PI * 6) * 0.035 + p.getY(i) * slope);
  }
  geometry.computeVertexNormals();
  const material = finish(color, 0.35); material.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
  const trim = finish('#655f54', 0.3);
  for (const side of [-1, 1]) {
    block(parent, [width, 0.12, 0.09], [x, y - side * depth * slope / 2, z + side * depth / 2], trim);
  }
  // Seams vary by sheet, but are stable on every return to the venue.
  for (let sx = -width / 2 + 1.6; sx < width / 2; sx += 1.6 + rng() * 0.15) {
    rod(parent, [x + sx, y + depth * slope / 2 + 0.04, z - depth / 2],
      [x + sx, y - depth * slope / 2 + 0.04, z + depth / 2], 0.018, trim);
  }
  return mesh;
}

export function trestle(parent, x, z, width, height, material) {
  for (const end of [-1, 1]) {
    for (const side of [-1, 1]) {
      rod(parent, [x + end * width / 2, 0, z + side * 0.65],
        [x + end * width / 2, height, z + side * 0.25], 0.07, material);
    }
    rod(parent, [x + end * width / 2, height * 0.4, z - 0.5],
      [x + end * width / 2, height * 0.4, z + 0.5], 0.045, material);
  }
  rod(parent, [x - width / 2, height * 0.65, z], [x + width / 2, height * 0.65, z], 0.05, material);
}
