// Builds everything level-specific into one Group (lights, table, caps, ball,
// goals, obstacles, backdrop) so switching venues is build → dispose, with
// no GPU memory left behind.
import * as THREE from 'three';
import { getVenueVisualProfile } from './venue-visual-profiles.js';
import { lightingForVenue } from './lighting-presets-by-time-of-day.js';
import { buildLightRig } from './scene-and-lighting-setup.js';
import { buildTableAndBattens } from './table-and-battens-builder.js';
import { buildBottleCapTeams } from './bottle-cap-players.js';
import { buildPaperMatchBall, buildMatchstickGoals } from './match-ball-and-goal-posts.js?v=2';
import { buildTableObstacles } from './table-obstacles-pebbles-bottles-coins.js';
import { buildStreetBackdropSteps } from './street-background-environment.js';
import { consumeBuildSteps } from '../core/cooperative-task-yield.js';

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function buildLevelStage(options) {
  const steps = levelStageBuildSteps(options);
  let next;
  do { next = steps.next(); } while (!next.done);
  next.value.activate();
  return next.value;
}

export function prepareLevelStage(options, scheduling) {
  return consumeBuildSteps(levelStageBuildSteps(options), scheduling);
}

export function* levelStageBuildSteps({ scene, renderer, level, homeTeam, awayTeam, camera, photograph }) {
  const preset = lightingForVenue(level.lighting, level.backdrop);
  const group = new THREE.Group();
  group.name = `stage-${level.id}`;

  let completed = false;
  try {
    group.add(buildLightRig(preset));
    yield;
    const seed = hashString(level.id);
    const visualProfile = getVenueVisualProfile(level.backdrop);
    buildTableAndBattens(group, level.surface, seed, visualProfile);
    yield;
    const caps = buildBottleCapTeams(group, homeTeam.palette, awayTeam.palette, seed, level.awaySlots);
    yield;
    const ballMesh = buildPaperMatchBall(group);
    const { postBodies, goals } = buildMatchstickGoals(group, visualProfile, seed);
    const obstacleBodies = buildTableObstacles(group, level.obstacles, seed);
    yield;
    const backdrop = yield* buildStreetBackdropSteps(group, level.backdrop, preset, { camera, photograph });
    completed = true;

    return {
      group, preset, caps, ballMesh, goals, postBodies, obstacleBodies, backdrop, visualProfile,
      activate() {
        scene.background = new THREE.Color(preset.fog);
        scene.fog.color.setHex(preset.fog);
        renderer.toneMappingExposure = preset.exposure;
        scene.add(group);
      },
      dispose() {
        backdrop.dispose();
        scene.remove(group);
        disposeObject3D(group);
      },
    };
  } finally { if (!completed) disposeObject3D(group); }
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
