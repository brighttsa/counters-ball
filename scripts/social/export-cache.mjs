import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { exportIdentity } from '../../social/data/export-identity.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
export function renderConfigKey(config, format, kind) {
  return createHash('sha256').update(exportIdentity(config, format, kind)).digest('hex');
}
export async function sourceFingerprint() {
  const hash = createHash('sha256');
  for (const directory of ['social/components', 'social/templates', 'social/motion', 'social/assets', 'vendor/fonts']) {
    for (const name of (await readdir(join(root, directory))).sort()) {
      const path = join(root, directory, name);
      if (name !== 'browser-export.js' && (await stat(path)).isFile()) hash.update(directory + '/' + name).update(await readFile(path));
    }
  }
  hash.update(await readFile(join(root, 'assets/konk-logo.svg')));
  hash.update(await readFile(join(root, 'social/index.html')));
  return hash.digest('hex');
}
export async function cachedExport(config, format, kind) {
  const key = renderConfigKey(config, format, kind), source = await sourceFingerprint();
  let entries;
  try { entries = JSON.parse(await readFile(join(root, 'social/exports/manifest.json'))); }
  catch { return null; }
  const entry = entries.find(e => e.id === config.id && e.format === format && e.kind === kind &&
    e.renderKey === key && e.sourceHash === source);
  if (!entry) return null;
  const path = join(root, 'social/exports', kind === 'mp4' ? 'motion' : format,
    kind === 'mp4' ? `${config.id}-${format}.mp4` : `${config.id}.png`);
  try { return (await stat(path)).isFile() ? path : null; } catch { return null; }
}
