import * as THREE from 'three';
import { photographSettings, sameOriginPhotographPath } from './location-photograph-configuration.js';

// The foreground and wall remain opaque occluders. This plane only fills
// distant openings; it never replaces the procedural fallback scenery.
export function buildLocationPhotograph(group, key, preset, camera, override) {
  const spec = photographSettings(key, override);
  const url = sameOriginPhotographPath(spec, globalThis.location?.href);
  let disposed = false, mesh = null, texture = null, opacity = 0;
  const origin = camera?.position.clone();
  const controller = new AbortController();
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const lifecycle = {
    update(_t, dt) {
      if (!mesh || disposed || !Number.isFinite(dt) || dt <= 0) return;
      opacity = reducedMotion?.matches ? spec.opacity : Math.min(spec.opacity, opacity + dt * 1.5);
      mesh.material.opacity = opacity;
      if (camera && origin && !reducedMotion?.matches) mesh.position.x = THREE.MathUtils.clamp((camera.position.x - origin.x) * spec.parallax, -0.3, 0.3);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      if (mesh) { group.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
      texture?.dispose();
      texture?.image?.close?.();
    },
  };
  if (!url) return lifecycle;
  // Reject redirects so a same-origin configuration cannot hotlink remotely.
  fetch(url, { signal: controller.signal, mode: 'same-origin', redirect: 'error', credentials: 'same-origin' })
    .then((response) => {
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('Photograph unavailable');
      return response.blob();
    })
    .then((blob) => createImageBitmap(blob, { imageOrientation: 'flipY' }))
    .then((bitmap) => {
      if (disposed) { bitmap.close(); return; }
      texture = new THREE.Texture(bitmap);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      const cropX = THREE.MathUtils.clamp(spec.crop[0], 0.05, 1);
      const cropY = THREE.MathUtils.clamp(spec.crop[1], 0.05, 1);
      texture.repeat.set(cropX, cropY);
      texture.offset.set(THREE.MathUtils.clamp(spec.focal[0] - cropX / 2, 0, 1 - cropX),
        THREE.MathUtils.clamp(1 - spec.focal[1] - cropY / 2, 0, 1 - cropY));
      const tint = new THREE.Color(...spec.grade).multiplyScalar(2 ** spec.exposure);
      const material = new THREE.MeshBasicMaterial({ map: texture, color: tint,
        transparent: true, opacity: 0, depthWrite: false, fog: false });
      material.onBeforeCompile = (shader) => {
        shader.uniforms.photoHaze = { value: spec.haze };
        shader.uniforms.photoFog = { value: new THREE.Color(preset.fog) };
        shader.uniforms.photoSaturation = { value: spec.saturation };
        shader.uniforms.photoTemperature = { value: spec.temperature };
        shader.uniforms.photoBlur = { value: new THREE.Vector2(spec.blur / bitmap.width, spec.blur / bitmap.height) };
        shader.fragmentShader = `uniform float photoHaze, photoSaturation, photoTemperature;
          uniform vec3 photoFog; uniform vec2 photoBlur;\n` + shader.fragmentShader;
        // Five texture taps bake softness into this distant plane, not the play field.
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          vec4 photoSample = texture2D(map, vMapUv) * 0.4;
          photoSample += texture2D(map, vMapUv + vec2(photoBlur.x, 0.0)) * 0.15;
          photoSample += texture2D(map, vMapUv - vec2(photoBlur.x, 0.0)) * 0.15;
          photoSample += texture2D(map, vMapUv + vec2(0.0, photoBlur.y)) * 0.15;
          photoSample += texture2D(map, vMapUv - vec2(0.0, photoBlur.y)) * 0.15;
          diffuseColor *= photoSample;`);
        shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
          float luminance = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
          outgoingLight = mix(vec3(luminance), outgoingLight, photoSaturation);
          outgoingLight *= vec3(1.0 + photoTemperature * 0.12, 1.0, 1.0 - photoTemperature * 0.12);
          outgoingLight = max(outgoingLight, vec3(0.0));
          outgoingLight = mix(outgoingLight, photoFog, clamp(photoHaze, 0.0, 1.0));
          float edge = smoothstep(0.0, 0.07, vMapUv.x) * smoothstep(0.0, 0.07, 1.0-vMapUv.x);
          edge *= smoothstep(0.0, 0.1, vMapUv.y) * smoothstep(0.0, 0.07, 1.0-vMapUv.y);
          diffuseColor.a *= edge;
          #include <opaque_fragment>`);
      };
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.width, spec.height), material);
      const horizonUV = (1 - spec.horizon - texture.offset.y) / cropY;
      mesh.position.set(0, spec.horizonY + (0.5 - horizonUV) * spec.height, spec.z);
      mesh.name = `licensed-distant-photograph-${key}`;
      group.add(mesh);
    }).catch(() => { /* Loading or decoding failures leave the procedural venue intact. */ });
  return lifecycle;
}
