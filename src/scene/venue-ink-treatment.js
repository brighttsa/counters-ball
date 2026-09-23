import * as THREE from 'three';
import { buildRoadsideInkArchitecture } from './roadside-ink-street-architecture.js';

function contour(mesh, color = 0x152220, opacity = .8) {
  if (!mesh.geometry || mesh.isInstancedMesh) return;
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 38),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  lines.name = 'selective-ink-contour'; mesh.add(lines);
}

export function applyVenueInkTreatment(stage, level) {
  if (stage.group.userData.inkApplied) return true;
  stage.group.userData.inkApplied = true;
  if (level.backdrop === 'roadside') buildRoadsideInkArchitecture(stage.group);
  // Keep each venue's light direction, temperature and local practical lights.
  const capMeshes = new Set();
  for (const cap of stage.caps) cap.pivot.traverse(o => capMeshes.add(o));
  const selected = [];
  stage.group.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || capMeshes.has(o) || o === stage.ballMesh) return;
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    if (!materials.some(m => m.isMeshStandardMaterial && !m.transparent)) return;
    o.geometry.computeBoundingSphere();
    const radius = o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z);
    if (radius > .12 && o.geometry.attributes.position.count < 12000) selected.push({ mesh: o, radius });
  });
  // Prioritize architecture and gameplay silhouettes; cap extra draw calls on dense venues.
  selected.sort((a, b) => b.radius - a.radius);
  for (const { mesh } of selected.slice(0, 96)) contour(mesh, 0x101917, .9);
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
      // Printed light bands preserve material hue; sparse shadow dots avoid muddying the pitch.
      mat.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
          `float inkLight = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
          float inkBand = floor(inkLight * 5.0 + 0.5) / 5.0;
          outgoingLight *= mix(1.0, max(inkBand, 0.035) / max(inkLight, 0.035), 0.65);
          float inkRim = smoothstep(0.18, 0.38, abs(dot(normal, normalize(vViewPosition))));
          outgoingLight *= mix(0.28, 1.0, inkRim);
          vec2 inkCell = mod(gl_FragCoord.xy, 5.0) - 2.5;
          float inkDot = 1.0 - smoothstep(0.65, 1.1, length(inkCell));
          outgoingLight *= 1.0 - inkDot * 0.16 * (1.0 - smoothstep(0.15, 0.65, inkLight));
          #include <opaque_fragment>`);
      };
      mat.customProgramCacheKey = () => 'venue-ink-v2'; mat.needsUpdate = true;
    }
  });
  return true;
}
