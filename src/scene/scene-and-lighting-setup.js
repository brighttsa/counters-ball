// Persistent renderer, scene and camera, plus the per-venue light rig
// (low sun + sky bounce + fill, and a warm bulb for night venues).
import * as THREE from 'three';
import { preferredShadowSize } from '../fx/adaptive-render-quality.js';

export function createRendererSceneCamera(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd99e63);
  scene.fog = new THREE.Fog(0xd99e63, 5.5, 13.0); // range set by the camera director

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 40);
  return { renderer, scene, camera };
}

function configureSoftShadow(light, size, extent) {
  light.castShadow = true;
  light.shadow.mapSize.set(size, size);
  if (light.isDirectionalLight) {
    Object.assign(light.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent });
  }
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 30;
  light.shadow.bias = -0.0006;
  light.shadow.radius = 5; // soft penumbra edges
}

/** @param preset entry from LIGHTING_PRESETS */
export function buildLightRig(preset) {
  const rig = new THREE.Group();
  rig.name = 'light-rig';

  const sun = new THREE.DirectionalLight(preset.sun.color, preset.sun.intensity);
  // Pushed out along its direction so the shadow box covers the street around the table too.
  sun.position.set(...preset.sun.position).multiplyScalar(2.5);
  configureSoftShadow(sun, preferredShadowSize(), 7.5);
  rig.add(sun, sun.target);

  rig.add(new THREE.HemisphereLight(preset.hemi.sky, preset.hemi.ground, preset.hemi.intensity));

  const fill = new THREE.DirectionalLight(preset.fill.color, preset.fill.intensity);
  fill.position.set(3.5, 1.6, -1.5);
  rig.add(fill);

  if (preset.bulb) {
    const b = preset.bulb;
    const bulb = new THREE.SpotLight(b.color, b.intensity, 9, b.angle, b.penumbra, 2);
    bulb.position.set(...b.position);
    configureSoftShadow(bulb, 1024, 0);
    bulb.shadow.radius = 4;
    rig.add(bulb, bulb.target);
  }
  return rig;
}
