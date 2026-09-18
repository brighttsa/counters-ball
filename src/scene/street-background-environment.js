// Assembles the world around the table for a venue: the painted ground, the
// building front behind it, the clutter lying about, the resident animals,
// and the air itself — leaf shade, harmattan dust, night-bulb flicker and
// drifting motes. Everything is built into the stage group, so it disposes
// with the venue.
import * as THREE from 'three';
import { createSeededRandom } from '../core/seeded-random-number-generator.js';
import {
  GROUND_Y, toTexture, blurredCopy, softGlowSpriteTexture,
} from './environment/canvas-texture-helpers.js';
import { buildVenueGround } from './environment/venue-ground-surface-painters.js';
import { paintWallFacade, WALL_SIZE } from './environment/street-wall-facade-painter.js';
import { EVERYDAY_PROP_BUILDERS } from './environment/ground-props-everyday-items.js';
import { VENUE_PROP_BUILDERS } from './environment/ground-props-venue-specific.js';
import { buildFowl } from './environment/wandering-chickens-and-guinea-fowl.js';
import {
  buildDappledLeafShade, buildHarmattanDustSheets, buildBulbFlicker,
} from './environment/light-shade-and-dust-overlays.js';
import { VENUE_ENVIRONMENTS } from './environment/venue-environment-compositions.js';
import { buildLocationPhotograph } from './environment/optional-distant-location-photograph.js';

const PROP_BUILDERS = { ...EVERYDAY_PROP_BUILDERS, ...VENUE_PROP_BUILDERS };
// Footprint radius animals walk around (flat props like mats and sachets are walkable).
const PROP_FOOTPRINT = { basinOranges: 1.9, bottleCrate: 1.4, schoolBag: 1.0, oldTyre: 1.9, grainSack: 1.3, jerrycan: 0.8, fishingNet: 1.5, coalPot: 0.9, pottedPlant: 0.7 };

function hashKey(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return h >>> 0;
}

function addWall(group, spec, rng) {
  const { color, lights } = paintWallFacade(spec, rng);
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(WALL_SIZE.width, WALL_SIZE.height),
    new THREE.MeshStandardMaterial({ map: toTexture(blurredCopy(color, 1.2)), roughness: 0.95 })
  );
  wall.position.set(0, GROUND_Y + WALL_SIZE.height / 2, spec.z);
  wall.receiveShadow = true;
  group.add(wall);

  const kerb = new THREE.Mesh( // concrete plinth along the wall base
    new THREE.BoxGeometry(WALL_SIZE.width, 0.55, 1.1),
    new THREE.MeshStandardMaterial({ color: spec.kerb ?? 0xa89c88, roughness: 0.95 })
  );
  kerb.position.set(0, GROUND_Y + 0.275, spec.z + 0.55);
  kerb.castShadow = kerb.receiveShadow = true;
  group.add(kerb);

  if (!lights) return { glowMaterials: [], spillLights: [] };
  const glow = new THREE.MeshBasicMaterial({
    map: toTexture(blurredCopy(lights, 3)), transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glowPlane = new THREE.Mesh(wall.geometry, glow);
  glowPlane.position.copy(wall.position).add(new THREE.Vector3(0, 0, 0.03));
  group.add(glowPlane);

  // A lit hatch throws warm light onto the ground in front of it.
  const spillLights = spec.features.filter((f) => f.type === 'hatch' && f.lit).map((hatch) => {
    const spill = new THREE.PointLight(0xffb870, 7, 9, 2);
    spill.position.set(hatch.x, GROUND_Y + hatch.y, spec.z + 1.6);
    group.add(spill);
    return spill;
  });
  return { glowMaterials: [glow], spillLights };
}

function addDustMotes(group, rng, count) {
  const positions = new Float32Array(count * 3);
  const drift = [];
  for (let i = 0; i < count; i++) {
    positions.set([(rng() - 0.5) * 9, GROUND_Y + rng() * 3.2, -1.5 - rng() * 5], i * 3);
    drift.push({ vx: (rng() - 0.5) * 0.03, vy: 0.004 + rng() * 0.012, ph: rng() * 6.28 });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.Points(geometry, new THREE.PointsMaterial({
    map: softGlowSpriteTexture(), size: 0.04, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending,
  })));
  return (t, dt) => {
    const p = geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      let y = p.getY(i) + drift[i].vy * dt * 12;
      const x = p.getX(i) + (drift[i].vx + Math.sin(t * 0.4 + drift[i].ph) * 0.015) * dt * 12;
      if (y > GROUND_Y + 3.4) y = GROUND_Y;
      p.setXYZ(i, x > 4.5 ? -4.5 : x, y, p.getZ(i));
    }
    p.needsUpdate = true;
  };
}

/**
 * @returns {{ update(t, dt): void, startle(): void }} — startle() on goals
 */
export function buildStreetBackdrop(group, key, preset, { camera, photograph } = {}) {
  const spec = VENUE_ENVIRONMENTS[key] ?? VENUE_ENVIRONMENTS.kiosk;
  const rng = createSeededRandom(hashKey(key));
  const updaters = [];
  const creatures = [];
  const photo = buildLocationPhotograph(group, key, preset, camera, photograph);
  let elapsed = 0;

  group.add(buildVenueGround(spec.ground, rng));
  const { glowMaterials, spillLights } = addWall(group, spec.wall, rng);

  const obstacles = [];
  for (const [kind, x, z, rotationY = 0, options = {}] of spec.props) {
    const prop = PROP_BUILDERS[kind](rng, options);
    prop.position.set(x, GROUND_Y, z);
    prop.rotation.y = rotationY;
    prop.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = !o.material.transparent;
      o.receiveShadow = true;
    });
    group.add(prop);
    if (prop.userData.update) updaters.push(prop.userData.update);
    if (PROP_FOOTPRINT[kind]) obstacles.push({ x, z, r: PROP_FOOTPRINT[kind] });
  }

  for (const [kind, options = {}] of spec.animals ?? []) {
    const creature = buildFowl(kind, rng, { ...options, obstacles });
    creature.object.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(creature.object);
    updaters.push(creature.update);
    creatures.push(creature);
  }

  if (spec.shade && !preset.bulb) updaters.push(buildDappledLeafShade(group, rng, spec.shade));
  if (spec.dustSheets) updaters.push(buildHarmattanDustSheets(group, rng, spec.dustSheets));
  const flicker = buildBulbFlicker(group, glowMaterials, spillLights);
  if (flicker) updaters.push(flicker);
  updaters.push(addDustMotes(group, rng, spec.dust ?? 90));

  return {
    update(_t, dt) {
      elapsed += Math.max(0, dt);
      for (const update of updaters) update(elapsed, dt);
      photo.update(elapsed, dt);
    },
    dispose() { photo.dispose(); },
    startle() { for (const creature of creatures) creature.startle(); },
  };
}
