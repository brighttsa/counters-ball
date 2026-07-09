// Post stack — subtle bloom, 35mm grain, vignette, warm dust haze — plus the
// goal celebration: camera push-in, screen shake and a warm bloom pulse.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const BLOOM_IDLE = 0.22;

// 35mm film grain + vignette + warm haze drifting in from the sunlit side.
const FilmGrainWarmHazeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.055 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uTime * 43.0) * 43758.5453); }
    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      // dust haze: soft warm veil, strongest toward the sunlit upper-left
      float haze = smoothstep(0.2, 1.15, 1.0 - distance(vUv, vec2(0.12, 0.92)));
      col = mix(col, vec3(1.0, 0.82, 0.6), haze * 0.085);
      // gentle warm grade
      col *= vec3(1.03, 0.99, 0.94);
      // 35mm grain
      col += (hash(vUv * vec2(1920.0, 1080.0)) - 0.5) * uGrain;
      // vignette
      float vig = smoothstep(0.95, 0.35, distance(vUv, vec2(0.5)));
      col *= mix(0.72, 1.0, vig);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function createPostProcessingAndCelebration(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), BLOOM_IDLE, 0.6, 0.93);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grainPass = new ShaderPass(FilmGrainWarmHazeShader);
  composer.addPass(grainPass); // grain applied after tone mapping, like real film

  const celebration = { active: false, t: 0, duration: 2.4, goalPos: new THREE.Vector3() };
  const shakeOffset = new THREE.Vector3();

  function startGoalCelebration(goalWorldX) {
    celebration.active = true;
    celebration.t = 0;
    celebration.goalPos.set(goalWorldX, 0, 0);
  }

  /**
   * Advance effects. Returns { pushIn: 0..1, focus: Vector3, shake: Vector3 }
   * that main.js blends into the camera each frame.
   */
  function update(dt, time) {
    grainPass.uniforms.uTime.value = time % 10;
    let pushIn = 0;
    shakeOffset.set(0, 0, 0);
    if (celebration.active) {
      celebration.t += dt;
      const p = celebration.t / celebration.duration;
      if (p >= 1) {
        celebration.active = false;
        bloom.strength = BLOOM_IDLE;
      } else {
        // Ease in fast, hold, release — a brief cinematic push toward the goal.
        pushIn = p < 0.25 ? p / 0.25 : p > 0.75 ? (1 - p) / 0.25 : 1;
        pushIn = pushIn * pushIn * (3 - 2 * pushIn);
        bloom.strength = BLOOM_IDLE + pushIn * 0.55; // warm light bloom swell
        const decay = Math.exp(-celebration.t * 3.2) * 0.035;
        shakeOffset.set(
          (Math.random() - 0.5) * decay,
          (Math.random() - 0.5) * decay * 0.6,
          (Math.random() - 0.5) * decay);
      }
    }
    return { pushIn, focus: celebration.goalPos, shake: shakeOffset };
  }

  function setSize(w, h) {
    composer.setSize(w, h);
    bloom.setSize(w, h);
  }

  return {
    render: () => composer.render(),
    update, setSize, startGoalCelebration,
    isCelebrating: () => celebration.active,
  };
}
