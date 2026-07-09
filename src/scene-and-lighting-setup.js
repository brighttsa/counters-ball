// Renderer, 45-degree tilted camera and warm Ghanaian late-afternoon lighting.
import * as THREE from 'three';

export const CAMERA_BASE_POSITION = new THREE.Vector3(0.35, 2.62, 2.72);
export const CAMERA_BASE_TARGET = new THREE.Vector3(0.05, 0, -0.08);

export function createRendererAndScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  // Warm dusty haze pushes the street backdrop out of focus and into memory.
  scene.background = new THREE.Color(0xd99e63);
  scene.fog = new THREE.Fog(0xd99e63, 5.5, 13.0);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 40);
  camera.position.copy(CAMERA_BASE_POSITION);
  camera.lookAt(CAMERA_BASE_TARGET);

  return { renderer, scene, camera };
}

export function addLateAfternoonLighting(scene) {
  // Low warm sun from the left of frame — long soft-edged shadows across the table.
  const sun = new THREE.DirectionalLight(0xffbe7d, 3.1);
  sun.position.set(-4.2, 2.3, 1.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -3.2;
  sun.shadow.camera.right = 3.2;
  sun.shadow.camera.top = 3.2;
  sun.shadow.camera.bottom = -3.2;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 12;
  sun.shadow.bias = -0.0006;
  sun.shadow.radius = 5; // soft penumbra edges
  scene.add(sun);
  scene.add(sun.target);

  // Warm sky bounce above, dusty reddish ground bounce below.
  const hemi = new THREE.HemisphereLight(0xffe2b8, 0x8a5a34, 0.75);
  scene.add(hemi);

  // Faint cool-ish fill from the shadow side so caps never go dead black.
  const fill = new THREE.DirectionalLight(0xc9b8a4, 0.35);
  fill.position.set(3.5, 1.6, -1.5);
  scene.add(fill);

  return { sun, hemi, fill };
}
