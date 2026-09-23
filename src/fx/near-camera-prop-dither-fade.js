import * as THREE from 'three';

// Props on the table (pots, toll booths, booms, coin stacks, goal frames, lorries) turn see-through
// where they come close to the player camera, so a low Street or Broadcast view is never walled off by
// the nearest prop. The fade is per pixel, by distance from the camera, so one near booth fades while
// the rest of a merged toll plaza stays solid. It is a screen-door dither (discarding a Bayer pattern of
// pixels), not alpha blending, so there is no transparent sorting and the props keep their shadows.
// Caps, ball, rails and the table surface are all lower than PROP_MIN_HEIGHT and are never touched.
const PROP_MIN_HEIGHT = .08; // above the ball (.07), caps (.03) and rail battens (.05)
// Fully solid beyond FAR of the camera-to-aim-point distance; at NEAR and closer, only FLOOR remains.
const FADE_NEAR = .5, FADE_FAR = .8, FADE_FLOOR = .25;

const DITHER = /* glsl */`
uniform float uPropFadeNear;
uniform float uPropFadeFar;
float propBayer4(vec2 p) {
  ivec2 i = ivec2(mod(p, 4.0));
  int index = i.x + i.y * 4;
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[index]) + 0.5) / 16.0;
}
`;
const DISCARD = /* glsl */`
if (uPropFadeFar > 0.0) {
  float propSolid = mix(${FADE_FLOOR.toFixed(2)}, 1.0, smoothstep(uPropFadeNear, uPropFadeFar, length(vViewPosition)));
  if (propSolid < propBayer4(gl_FragCoord.xy)) discard;
}
`;

export class NearCameraPropDitherFade {
  constructor(stage) {
    this.uniforms = { uPropFadeNear: { value: 0 }, uPropFadeFar: { value: 0 } };
    this.props = [];
    stage.group.updateMatrixWorld(true);
    stage.group.traverse(mesh => {
      if (!mesh.isMesh || !mesh.visible || Array.isArray(mesh.material) || mesh.material?.transparent) return;
      const box = new THREE.Box3().setFromObject(mesh);
      const onTable = box.max.x > -2.3 && box.min.x < 2.3 && box.max.z > -1.5 && box.min.z < 1.5;
      if (!onTable || box.max.y < PROP_MIN_HEIGHT || box.max.y > 1.2) return; // skip room scenery overhead
      this.props.push(mesh);
    });
    this.faded = new Map(); // original material → its fading copy
    this.applyToProps();
  }

  // Props draw with a fading copy of their material, so a material shared with the table or the pieces
  // stays solid there. Re-applied every frame because some props swap materials in play (a coin stack's
  // coins switch to the lit material); one copy per original material is made and then reused.
  applyToProps() {
    for (const mesh of this.props) {
      if (mesh.material.userData.nearCameraFade) continue;
      let copy = this.faded.get(mesh.material);
      if (!copy) {
        copy = mesh.material.clone();
        copy.userData.nearCameraFade = true;
        copy.onBeforeCompile = shader => {
          if (!shader.fragmentShader.includes('vViewPosition')) return; // unlit materials: leave solid
          Object.assign(shader.uniforms, this.uniforms);
          shader.fragmentShader = DITHER + shader.fragmentShader.replace('void main() {', `void main() {\n${DISCARD}`);
        };
        copy.customProgramCacheKey = () => 'near-camera-prop-dither-fade';
        this.faded.set(mesh.material, copy);
      }
      mesh.material = copy;
    }
  }

  /** Fade props nearer than a share of the camera-to-aim-point distance. */
  update(camera, target) {
    this.applyToProps();
    const distance = camera.position.distanceTo(target);
    this.uniforms.uPropFadeNear.value = distance * FADE_NEAR;
    this.uniforms.uPropFadeFar.value = distance * FADE_FAR;
  }

  /** Everything solid again (replays, goal cameras, the attract loop). */
  restore() { this.uniforms.uPropFadeFar.value = 0; }
}
