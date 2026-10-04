// The film's three locations, built once with the game's own stage builder and
// switched by visibility on each cut: Jamestown under the bulb, the kiosk in
// late-afternoon light and the veranda at golden hour.
import { CAMPAIGN_LEVELS, HOME_TEAM } from '../../src/levels/campaign-level-definitions.js';
import { buildLevelStage } from '../../src/scene/level-stage-builder-and-disposal.js';
import { upgradeToHeroCap, upgradeToHeroBall } from './promo-hero-cap-geometry-and-painted-faces.js';
import { FILM_SEED } from './nxwrth-promo-timeline-config.js';

const byId = (id) => CAMPAIGN_LEVELS.find((level) => level.id === id);

// Bare tables: the film is about caps, a ball and two goals.
const LOCATIONS = {
  night: { ...byId('nightbulb'), id: 'promo-night', obstacles: [] },
  day: { ...byId('kiosk'), id: 'promo-day', obstacles: [] },
  gold: { ...byId('veranda'), id: 'promo-gold', obstacles: [] },
};

/** Cap indices: 0-4 home (Accra Reds), 5-9 away. */
export const RED_HERO = 3;
export const NXWRTH_CAP = 9;

export function buildPromoStages({ scene, renderer, camera, post }) {
  const stages = {};
  for (const [name, level] of Object.entries(LOCATIONS)) {
    const stage = buildLevelStage({ scene, renderer, camera, level, homeTeam: HOME_TEAM, awayTeam: level.opponent.team });
    stage.level = level;
    stage.caps.forEach((cap) => { cap.baseSpin = cap.mesh.rotation.y; });
    upgradeToHeroBall(stage.ballMesh);
    stage.group.visible = false;
    stages[name] = stage;
  }
  const night = stages.night;
  upgradeToHeroCap(night.caps[RED_HERO], { ...HOME_TEAM.palette, art: 'star' }, FILM_SEED + 3);
  upgradeToHeroCap(night.caps[NXWRTH_CAP], { paint: '#211e1b', paintDark: '#0f0e0c', art: 'nxwrth' }, FILM_SEED + 9);
  upgradeToHeroCap(stages.gold.caps[RED_HERO], { ...HOME_TEAM.palette, art: 'star' }, FILM_SEED + 13);

  let active = null;
  return {
    stages,

    /** Compiles every location's shaders up front, so no cut pays for it. */
    warmUp() {
      for (const name of Object.keys(stages)) {
        this.activate(name);
        renderer.compile(scene, camera);
      }
    },

    activate(name) {
      if (active === name) return stages[name];
      for (const [key, stage] of Object.entries(stages)) stage.group.visible = key === name;
      const { preset } = stages[name];
      scene.background.setHex(preset.fog);
      scene.fog.color.setHex(preset.fog);
      [scene.fog.near, scene.fog.far] = preset.fogRange;
      renderer.toneMappingExposure = preset.exposure;
      post.applyPreset(preset);
      active = name;
      return stages[name];
    },

    dispose() {
      for (const stage of Object.values(stages)) stage.dispose();
    },
  };
}
