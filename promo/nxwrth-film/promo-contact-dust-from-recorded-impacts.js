// Dust kicked up by contacts, computed from the impacts' ages rather than
// simulated frame to frame, so a scrubbed or exported frame always shows the
// same puff. (The game's particle pool integrates over time and uses Math.random.)
import * as THREE from 'three';
import { softGlowSpriteTexture } from '../../src/scene/environment/canvas-texture-helpers.js';
import { createSeededRandom } from '../../src/core/seeded-random-number-generator.js';

const POOL = 64;
const LIFE = 0.75;

export function createContactDust(scene) {
  const texture = softGlowSpriteTexture();
  const sprites = Array.from({ length: POOL }, () => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: 0xf1e2c4, transparent: true, opacity: 0, depthWrite: false }));
    sprite.visible = false;
    scene.add(sprite);
    return sprite;
  });

  return {
    /**
     * @param impacts [{ t: filmSeconds, x, z, strength, kind }] for the shot on screen
     * @param lens camera position
     * @param density 0..1: a lens centimetres from the table needs far less dust than a wide shot
     */
    render(filmTime, impacts, lens, density = 1) {
      let used = 0;
      for (let n = 0; n < impacts.length && used < POOL; n++) {
        const impact = impacts[n], age = filmTime - impact.t;
        if (age < 0 || age > LIFE || impact.x == null) continue;
        if (Math.hypot(impact.x - lens.x, impact.z - lens.z) < 0.3) continue; // a puff against the glass would only fog the frame
        const strength = impact.strength * (impact.kind === 'flick' ? 0.25 : 1);
        const rng = createSeededRandom(977 + n * 131);
        const count = Math.min(9, Math.round(2 + strength * 8));
        for (let i = 0; i < count && used < POOL; i++) {
          const a = rng() * Math.PI * 2, speed = 0.05 + rng() * 0.24 * (0.4 + strength), life = LIFE * (0.6 + rng() * 0.4);
          const rise = 0.03 + rng() * 0.08, k = age / life;
          if (k >= 1) continue;
          const travel = speed * (1 - Math.exp(-age * 4)) / 4 * 3; // drag: a quick burst that hangs
          const sprite = sprites[used++];
          sprite.visible = true;
          sprite.position.set(impact.x + Math.cos(a) * travel, 0.012 + rise * age, impact.z + Math.sin(a) * travel);
          sprite.scale.setScalar((0.025 + strength * 0.05) * (1 + k * 1.6));
          sprite.material.opacity = (0.2 + strength * 0.34) * (1 - k) * (1 - k) * density;
        }
      }
      for (let i = used; i < POOL; i++) sprites[i].visible = false;
    },
    dispose() {
      for (const sprite of sprites) { scene.remove(sprite); sprite.material.dispose(); }
    },
  };
}
