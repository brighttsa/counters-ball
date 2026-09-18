// Builds everything level-specific into one Group (lights, table, caps, ball,
// goals, obstacles, backdrop) so switching venues is build → dispose, with
// no GPU memory left behind.
import * as THREE from 'three';
import { lightingForVenue } from './lighting-presets-by-time-of-day.js';
import { buildLightRig } from './scene-and-lighting-setup.js';
import { buildTableAndBattens } from './table-and-battens-builder.js';
import { buildBottleCapTeams } from './bottle-cap-players.js';
import { buildPaperMatchBall, buildMatchstickGoals } from './match-ball-and-goal-posts.js';
import { buildTableObstacles } from './table-obstacles-pebbles-bottles-coins.js';
import { buildStreetBackdrop } from './street-background-environment.js';

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function buildLevelStage({ scene, renderer, level, homeTeam, awayTeam, camera, photograph }) {
  const preset = lightingForVenue(level.lighting, level.backdrop);
  const group = new THREE.Group();
  group.name = `stage-${level.id}`;

  scene.background = new THREE.Color(preset.fog);
  scene.fog.color.setHex(preset.fog);
  renderer.toneMappingExposure = preset.exposure;

  group.add(buildLightRig(preset));
  const seed = hashString(level.id);
  buildTableAndBattens(group, level.surface, seed);
  const caps = buildBottleCapTeams(group, homeTeam.palette, awayTeam.palette, seed);
  const ballMesh = buildPaperMatchBall(group);
  const { postBodies, goals } = buildMatchstickGoals(group);
  const obstacleBodies = buildTableObstacles(group, level.obstacles, seed);
  const backdrop = buildStreetBackdrop(group, level.backdrop, preset, { camera, photograph });
  scene.add(group);

  return {
    group, preset, caps, ballMesh, goals, postBodies, obstacleBodies, backdrop,
    dispose() {
      backdrop.dispose();
      scene.remove(group);
      disposeObject3D(group);
    },
  };
}

/** Free geometries, materials, textures and shadow maps under `root`. */
export function disposeObject3D(root) {
  const seenMaterials = new Set();
  root.traverse((obj) => {
    obj.geometry?.dispose();
    if (obj.isLight) obj.shadow?.dispose(); // shadow render targets live on LightShadow
    const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
    for (const material of materials) {
      if (seenMaterials.has(material)) continue;
      seenMaterials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) value.dispose();
      }
      material.uniforms && Object.values(material.uniforms).forEach((u) => u.value?.isTexture && u.value.dispose());
      material.dispose();
    }
  });
}
