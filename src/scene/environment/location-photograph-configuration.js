// Opt in only after supplying a licensed local image and its attribution.
const photo = (haze, grade) => ({
  enabled: false, path: null, credit: '', license: '',
  horizon: 0.48, horizonY: 3, focal: [0.5, 0.5], crop: [1, 1],
  exposure: -0.25, grade, haze, parallax: 0.025,
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

export function sameOriginPhotographPath(config, baseURL) {
  if (!config?.enabled || !config.credit?.trim() || !config.license?.trim()) return null;
  if (typeof config.path !== 'string' || !config.path.startsWith('/') || config.path.startsWith('//')) return null;
  try {
    const base = new URL(baseURL), url = new URL(config.path, base);
    return url.origin === base.origin && /^https?:$/.test(url.protocol) ? url.href : null;
  } catch { return null; }
}
