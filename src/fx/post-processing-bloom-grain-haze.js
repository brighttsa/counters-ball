// Post stack — subtle bloom, 35mm grain, vignette and warm dust haze, all
// driven by the venue's lighting preset — plus decaying bloom pulses for goals.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const FilmGrainWarmHazeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.045 },
    uHaze: { value: 0.07 },
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
      float haze = smoothstep(0.18, 1.12, 1.0 - distance(vUv, vec2(0.12, 0.92))); // strongest toward the light
      col = mix(col, uHazeColor, haze * uHaze);
      col *= vec3(1.035, 1.005, 0.965);                                           // warm, but not brown
      col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, 1.08);          // preserve venue colour separation
      col += (hash(vUv * vec2(1920.0, 1080.0)) - 0.5) * uGrain;                   // 35mm grain
      col *= mix(0.8, 1.03, smoothstep(0.95, 0.34, distance(vUv, vec2(0.5))));    // readable centre, softer edge
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function createPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // Shallow depth of field: sharp at the table, the street behind melts softly.
  // The stock shader blurs linearly from the focal plane; a sharp zone keeps the whole
  // pitch crisp and lets only the street beyond it fall off into bokeh.
  const bokeh = new BokehPass(scene, camera, { focus: 5, aperture: 0.004, maxblur: 0.013 });
  bokeh.uniforms.sharpZone = { value: 1.9 };
  bokeh.materialBokeh.fragmentShader = bokeh.materialBokeh.fragmentShader
    .replace('uniform float focus;', 'uniform float focus;\n\t\tuniform float sharpZone;')
    .replace('float factor = ( focus + viewZ );', 'float delta = focus + viewZ;\n\t\t\tfloat factor = sign( delta ) * max( abs( delta ) - sharpZone, 0.0 );');
  bokeh.materialBokeh.needsUpdate = true;
  composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.18, 0.48, 0.95);
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
      grain.uniforms.uGrain.value = preset.grain * 0.78;
      grain.uniforms.uHaze.value = preset.haze.amount * 0.82;
      grain.uniforms.uHazeColor.value.set(...preset.haze.color);
      bloomBase = preset.bulb ? 0.26 : 0.18;
    },

    setFocus(distance) {
      if (Number.isFinite(distance)) bokeh.uniforms.focus.value = distance;
    },

    pulseBloom(amount) {
      bloomPulse = Math.max(bloomPulse, amount);
    },

    update(dt, t) {
      grain.uniforms.uTime.value = t % 10;
      bloomPulse *= Math.exp(-dt * 1.3);
      bloom.strength = bloomBase + bloomPulse;
    },

    setBokehEnabled(on) { bokeh.enabled = on; },
    get bokehEnabled() { return bokeh.enabled; },
  };
}
