// Post stack — subtle bloom, 35mm grain, vignette and warm dust haze, all
// driven by the venue's lighting preset — plus decaying bloom pulses for goals.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const FilmGrainWarmHazeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.055 },
    uHaze: { value: 0.085 },
    uHazeColor: { value: new THREE.Vector3(1.0, 0.82, 0.6) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uGrain, uHaze;
    uniform vec3 uHazeColor;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uTime * 43.0) * 43758.5453); }
    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float haze = smoothstep(0.2, 1.15, 1.0 - distance(vUv, vec2(0.12, 0.92))); // strongest toward the light
      col = mix(col, uHazeColor, haze * uHaze);
      col *= vec3(1.03, 0.99, 0.94);                                              // gentle warm grade
      col += (hash(vUv * vec2(1920.0, 1080.0)) - 0.5) * uGrain;                   // 35mm grain
      col *= mix(0.72, 1.0, smoothstep(0.95, 0.35, distance(vUv, vec2(0.5))));    // vignette
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function createPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.22, 0.6, 0.93);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grain = new ShaderPass(FilmGrainWarmHazeShader);
  composer.addPass(grain); // after tone mapping, like grain on real film

  let bloomBase = 0.22;
  let bloomPulse = 0;

  return {
    render: () => composer.render(),

    setSize(w, h) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
    },

    applyPreset(preset) {
      grain.uniforms.uGrain.value = preset.grain;
      grain.uniforms.uHaze.value = preset.haze.amount;
      grain.uniforms.uHazeColor.value.set(...preset.haze.color);
      bloomBase = preset.bulb ? 0.32 : 0.22;
    },

    pulseBloom(amount) {
      bloomPulse = Math.max(bloomPulse, amount);
    },

    update(dt, t) {
      grain.uniforms.uTime.value = t % 10;
      bloomPulse *= Math.exp(-dt * 1.3);
      bloom.strength = bloomBase + bloomPulse;
    },
  };
}
