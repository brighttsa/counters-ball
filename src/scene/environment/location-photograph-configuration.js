// Opt in only after supplying a licensed local image and its attribution.
const photo = (haze, grade) => ({
  enabled: false, path: null, credit: '', license: '',
  horizon: 0.48, horizonY: 3, focal: [0.5, 0.5], crop: [1, 1],
  exposure: -0.25, grade, haze, parallax: 0.025,
  saturation: 0.8, temperature: 0, blur: 2, opacity: 0.85,
  width: 100, height: 38, z: -24,
});

export const LOCATION_PHOTOGRAPHS = {
  schoolyard: photo(0.18, [1, 1, 0.96]),
  kiosk: photo(0.22, [1, 0.95, 0.87]),
  veranda: photo(0.2, [1, 0.93, 0.83]),
  roadside: photo(0.28, [0.95, 0.98, 1]),
  harmattan: photo(0.5, [1, 0.96, 0.87]),
  night: photo(0.3, [0.78, 0.88, 1]),
};

const bounded = (value, fallback, min, max) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

// Blur is in source-image pixels; temperature is a restrained cool/warm grade.
export function photographSettings(key, override = {}) {
  const name = key === 'nightbulb' ? 'night' : key;
  const defaults = LOCATION_PHOTOGRAPHS[name] ?? LOCATION_PHOTOGRAPHS.kiosk;
  const spec = { ...defaults, ...override };
  for (const [field, min, max] of [
    ['saturation', 0, 2], ['temperature', -1, 1], ['blur', 0, 16], ['opacity', 0, 1],
    ['haze', 0, 1], ['exposure', -4, 4], ['parallax', 0, 0.1], ['horizon', 0, 1],
    ['width', 1, 200], ['height', 1, 100], ['z', -100, -16], ['horizonY', -20, 30],
  ]) spec[field] = bounded(spec[field], defaults[field], min, max);
  for (const [field, min, max] of [['crop', 0.05, 1], ['focal', 0, 1], ['grade', 0, 2]]) {
    spec[field] = defaults[field].map((value, i) => bounded(spec[field]?.[i], value, min, max));
  }
  return spec;
}

export function sameOriginPhotographPath(config, baseURL) {
  if (!config?.enabled || typeof config.credit !== 'string' || !config.credit.trim()
    || typeof config.license !== 'string' || !config.license.trim()) return null;
  if (typeof config.path !== 'string' || !config.path.startsWith('/') || config.path.startsWith('//')) return null;
  try {
    const base = new URL(baseURL), url = new URL(config.path, base);
    return url.origin === base.origin && /^https?:$/.test(url.protocol) ? url.href : null;
  } catch { return null; }
}
