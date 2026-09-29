// Monitors frame rate and drops rendering quality when it falls below 50 fps.
// Three tiers: high (default desktop), medium (default touch), low (auto-fallback).
// The detected tier is saved so repeat visits on the same device skip the probe.

const STORAGE_KEY = 'counters-ball-3d/render-tier';
const PROBE_FRAMES = 90;
const PROBE_WARMUP = 30;
const TARGET_MS = 20; // 50 fps budget

const TIERS = {
  high:   { pixelRatioCap: 2,   shadowSize: 4096, bokeh: true  },
  medium: { pixelRatioCap: 2,   shadowSize: 2048, bokeh: true  },
  low:    { pixelRatioCap: 1.5, shadowSize: 1024, bokeh: false },
};

function loadSavedTier() {
  try { const v = localStorage.getItem(STORAGE_KEY); if (v && TIERS[v]) return v; } catch {}
  return null;
}

function saveTier(tier) {
  try { localStorage.setItem(STORAGE_KEY, tier); } catch {}
}

export function preferredShadowSize() {
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const tier = loadSavedTier() || (isTouch ? 'medium' : 'high');
  return TIERS[tier].shadowSize;
}

export function createAdaptiveQuality(renderer, post, scene) {
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  const saved = loadSavedTier();
  let tier = saved || (isTouch ? 'medium' : 'high');
  let probing = !saved;
  let frameIndex = 0;
  const frameTimes = [];

  function findSunLight() {
    let sun = null;
    scene.traverse(o => {
      if (!sun && o.isDirectionalLight && o.castShadow) sun = o;
    });
    return sun;
  }

  function apply(newTier) {
    tier = newTier;
    const cfg = TIERS[tier];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, cfg.pixelRatioCap));
    const w = window.innerWidth, h = window.innerHeight;
    if (w > 0 && h > 0) {
      renderer.setSize(w, h);
      post.setSize(w, h);
    }
    post.setBokehEnabled(cfg.bokeh);
    const sun = findSunLight();
    if (sun && sun.shadow.mapSize.x !== cfg.shadowSize) {
      sun.shadow.mapSize.set(cfg.shadowSize, cfg.shadowSize);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
  }

  apply(tier);

  return {
    get tier() { return tier; },

    sampleFrame(dtMs) {
      if (!probing || dtMs <= 0) return;
      frameIndex++;
      if (frameIndex <= PROBE_WARMUP) return;
      frameTimes.push(dtMs);
      if (frameTimes.length < PROBE_FRAMES) return;

      probing = false;
      frameTimes.sort((a, b) => a - b);
      const p90 = frameTimes[Math.floor(frameTimes.length * 0.9)];

      if (p90 <= TARGET_MS) {
        saveTier(tier);
        return;
      }

      const downgrade = tier === 'high' ? 'medium' : tier === 'medium' ? 'low' : null;
      if (downgrade) {
        apply(downgrade);
        saveTier(tier);
        frameIndex = 0;
        frameTimes.length = 0;
        probing = true;
      } else {
        saveTier(tier);
      }
    },

    applyOnResize() {
      const cfg = TIERS[tier];
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, cfg.pixelRatioCap));
    },
  };
}
