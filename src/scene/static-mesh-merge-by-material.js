// Collapses static set-piece meshes that share a material into one mesh each,
// so a detailed build (booths, kerbs, posts, canopy) costs a handful of draw
// calls instead of dozens — and the same again in the shadow pass. Moving
// parts are left alone by passing a `keep` predicate. Dependency-free on
// purpose: Node tests map only bare `three`, not `three/addons`.
import * as THREE from 'three';

function mergeGeometries(geometries) {
  const names = ['position', 'normal', 'uv'];
  const arrays = Object.fromEntries(names.map((n) => [n, []]));
  const indices = [];
  let offset = 0;
  for (const g of geometries) {
    for (const n of names) arrays[n].push(...g.attributes[n].array);
    const count = g.attributes.position.count;
    if (g.index) for (const i of g.index.array) indices.push(i + offset);
    else for (let i = 0; i < count; i++) indices.push(i + offset);
    offset += count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(arrays.position, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(arrays.normal, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(arrays.uv, 2));
  merged.setIndex(indices);
  return merged;
}

/** Merge every static mesh under `root` (not matched by `keep`) per material. */
export function mergeStaticMeshesByMaterial(root, keep = () => false) {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const byMaterial = new Map();
  const merged = [];
  root.traverse((o) => {
    if (!o.isMesh || keep(o) || Array.isArray(o.material)) return;
    if (!['position', 'normal', 'uv'].every((n) => o.geometry.attributes[n])) return;
    merged.push(o);
    const g = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(toRoot, o.matrixWorld));
    (byMaterial.get(o.material) ?? byMaterial.set(o.material, []).get(o.material)).push(g);
  });
  for (const o of merged) { o.removeFromParent(); o.geometry.dispose(); }
  for (const [material, geometries] of byMaterial) {
    const mesh = new THREE.Mesh(mergeGeometries(geometries), material);
    mesh.castShadow = mesh.receiveShadow = material.isMeshStandardMaterial === true;
    root.add(mesh);
    geometries.forEach((g) => g.dispose());
  }
  return byMaterial.size;
}
