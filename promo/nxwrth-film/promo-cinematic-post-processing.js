// The film's lens: the game's look (bloom, 35mm grain, warm haze, vignette) with
// the depth of field opened up per shot. The game keeps its aperture fixed and
// private because play needs the whole pitch sharp; macro shots need it wide open.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const FilmGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.05 },
    uHaze: { value: 0.07 },
    uHazeColor: { value: new THREE.Vector3(1.0, 0.82, 0.6) },
    uVignette: { value: 0.3 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uGrain, uHaze, uVignette;
    uniform vec3 uHazeColor;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uTime * 43.0) * 43758.5453); }
    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float haze = smoothstep(0.18, 1.12, 1.0 - distance(vUv, vec2(0.12, 0.92)));
      col = mix(col, uHazeColor, haze * uHaze);
      col *= vec3(1.035, 1.005, 0.965);
      col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, 1.1);
      col += (hash(vUv * vec2(1920.0, 1080.0)) - 0.5) * uGrain;
      col *= mix(1.0 - uVignette, 1.03, smoothstep(0.98, 0.3, distance(vUv, vec2(0.5))));
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function createCinematicPost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 3, aperture: 0.004, maxblur: 0.012 });
  // A band around the focal plane stays fully sharp, so the subject holds while the rest melts.
  bokeh.uniforms.sharpZone = { value: 0.05 };
  bokeh.materialBokeh.fragmentShader = bokeh.materialBokeh.fragmentShader
    .replace('uniform float focus;', 'uniform float focus;\n\t\tuniform float sharpZone;')
    .replace('float factor = ( focus + viewZ );', 'float delta = focus + viewZ;\n\t\t\tfloat factor = sign( delta ) * max( abs( delta ) - sharpZone, 0.0 );');
  bokeh.materialBokeh.needsUpdate = true;
  composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1920, 1080), 0.2, 0.5, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(FilmGradeShader);
  composer.addPass(grade);
  let bloomBase = 0.2;

  return {
    render: () => composer.render(),

    setSize(width, height) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    },

    applyPreset(preset) {
      grade.uniforms.uGrain.value = preset.grain;
      grade.uniforms.uHaze.value = preset.haze.amount * 0.82;
      grade.uniforms.uHazeColor.value.set(...preset.haze.color);
      grade.uniforms.uVignette.value = preset.bulb ? 0.42 : 0.26;
      bloomBase = preset.bulb ? 0.34 : 0.2;
    },

    /**
     * @param focus world distance to the sharp plane
     * @param aperture blur gained per world unit off the plane (0.004 game play … 0.2 extreme macro)
     * @param sharpZone half-depth of the fully sharp band, world units
     * @param maxBlur cap, in screen heights
     */
    setLens({ focus, aperture = 0.02, sharpZone = 0.05, maxBlur = 0.014 }) {
      bokeh.uniforms.focus.value = focus;
      bokeh.uniforms.aperture.value = aperture;
      bokeh.uniforms.maxblur.value = maxBlur;
      bokeh.uniforms.sharpZone.value = sharpZone;
    },

    /** @param pulse 0..1 extra bloom for an impact, decided by the director from film time */
    setFrame(filmTime, pulse = 0) {
      grade.uniforms.uTime.value = Math.floor(filmTime * 24) / 24 % 10; // grain steps at film cadence, and repeats on export
      bloom.strength = bloomBase + pulse;
    },
  };
}
