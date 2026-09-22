import * as THREE from 'three';
import { buildRoadsideInkArchitecture } from './roadside-ink-street-architecture.js';

export const isInkRoadside = level => level.mechanic?.type === 'toll-gates';

function contour(mesh, color = 0x152220, opacity = .8) {
  if (!mesh.geometry || mesh.isInstancedMesh) return;
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 38),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  lines.name = 'selective-ink-contour'; mesh.add(lines);
}

export function applyRoadsideInkTreatment(stage, level) {
  if (!isInkRoadside(level)) return false;
  const architecture = buildRoadsideInkArchitecture(stage.group);
  stage.group.traverse(o => {
    if (o.isDirectionalLight) o.color.setHex(0xfff5df);
    if (o.isHemisphereLight) { o.color.setHex(0xc4e0df); o.groundColor.setHex(0x696d60); }
  });
  const selected = [];
  architecture.traverse(o => { if (o.isMesh) selected.push(o); });
  stage.group.getObjectByName('tema-toll-plaza')?.traverse(o => {
    if (o.isMesh && o.material?.isMeshStandardMaterial) selected.push(o);
  });
  for (const mesh of selected) contour(mesh);
  for (const cap of stage.caps) {
    // One silhouette per cap, not outlines around every flute and printed scratch.
    const ring = new THREE.Mesh(new THREE.RingGeometry(cap.radius * .94, cap.radius * 1.1, 44),
      new THREE.MeshBasicMaterial({ color: 0x101514, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .006; cap.pivot.add(ring);
    for (const mat of cap.mesh.material) { mat.roughness = .8; mat.metalness = .18; }
  }
  contour(stage.ballMesh, 0x383d34, .65);
  const materials = new Set();
  stage.group.traverse(o => {
    if (!o.isMesh || o.name === 'selective-ink-contour') return;
    for (const mat of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!mat?.isMeshStandardMaterial || materials.has(mat)) continue;
      materials.add(mat);
      // Quantize only the diffuse lighting, leaving material hue and texture intact.
      mat.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
          'outgoingLight = mix(outgoingLight, floor(outgoingLight * 5.0 + 0.5) / 5.0, 0.25);\n#include <opaque_fragment>');
      };
      mat.customProgramCacheKey = () => 'roadside-ink-v1'; mat.needsUpdate = true;
    }
  });
  return true;
}
