import { formats } from './campaign.js';
const fields = ['id', 'layout', 'feature', 'palette', 'headline', 'subheadline', 'eyebrow', 'signature', 'cta',
  'venue', 'logoPosition', 'background', 'foreground', 'accent', 'gameplayImage', 'question', 'closing',
  'homeName', 'awayName', 'homeScore', 'awayScore'];
export function exportIdentity(config, format, kind) {
  const visual = Object.fromEntries(fields.map(key => [key, String(config[key] ?? '')]));
  return JSON.stringify({ ...visual, decoration: Boolean(config.decoration),
    duration: kind === 'mp4' ? config.motionDuration || 3 : null, dimensions: formats[format], format, kind });
}
export function hasVisualEdits(config, original, format, kind) {
  return exportIdentity(config, format, kind) !== exportIdentity(original, format, kind);
}
export function hasFinishedMotion(config, format) {
  return Boolean(config.motion && (config.motionFormats || ['portrait']).includes(format));
}
