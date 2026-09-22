import * as THREE from 'three';
import { GROUND_Y } from './canvas-texture-helpers.js';
import { buildSchoolCourtyard, buildDomesticVeranda } from './venue-architecture-domestic-courtyards.js';
import { buildMarketKiosk, buildJamestownKiosk } from './venue-architecture-market-kiosks.js';
import { buildRoadsideChopBar, buildLorryStation } from './venue-architecture-transport-yards.js';

const BUILDERS = {
  schoolyard: buildSchoolCourtyard, kiosk: buildMarketKiosk, veranda: buildDomesticVeranda,
  roadside: buildRoadsideChopBar, harmattan: buildLorryStation, night: buildJamestownKiosk,
};

export function resolveEnvironmentKey(key) {
  if (key === 'nightbulb') return 'night';
  return Object.hasOwn(BUILDERS, key) ? key : 'kiosk';
}

export function buildVenueArchitecture(parent, key, rng, wall) {
  key = resolveEnvironmentKey(key);
  const root = new THREE.Group(); root.name = `venue-architecture-${key}`;
  root.position.y = GROUND_Y; parent.add(root);
  const architecture = BUILDERS[key](root, rng, wall);
  return { root, update: architecture.update };
}
