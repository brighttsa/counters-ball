import { cp, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { posters } from '../../social/data/campaign.js';
import { renderConfigKey, sourceFingerprint } from './export-cache.mjs';
import { run } from './render-exports.mjs';
const source = fileURLToPath(new URL('../../social/', import.meta.url));
const entries = JSON.parse(await readFile(join(source, 'exports/manifest.json')));
const fingerprint = await sourceFingerprint();
for (const entry of entries) {
  const config = posters.find(p => p.id === entry.id);
  if (!config || entry.sourceHash !== fingerprint || entry.renderKey !== renderConfigKey(config, entry.format, entry.kind))
    throw Error(`Stale export: ${entry.id}/${entry.format}/${entry.kind}`);
}
const portable = entries.map(({ path, ...entry }) => entry);
await writeFile(join(source, 'exports/manifest.json'), JSON.stringify(portable, null, 2));
await writeFile(join(source, 'exports/campaign-copy.json'), JSON.stringify(posters, null, 2));
const assetPath = e => e.kind === 'mp4' ? `motion/${e.id}-${e.format}.mp4` : `${e.format}/${e.id}.png`;
for (const [name, select] of [
  ['KONKERS-Campaign', () => true],
  ['KONK-New-Features', e => posters.find(p => p.id === e.id).group === 'New Features'],
  ['KONK-Twi-First', e => e.id === '19-twi-first'],
]) {
  const selected = entries.filter(select), temp = join(source, `${name}.next.zip`);
  const copy = selected.map(e => e.id).filter((id, i, ids) => ids.indexOf(id) === i).map(id => posters.find(p => p.id === id));
  const captionFile = `${name}-captions.json`;
  await writeFile(join(source, 'exports', captionFile), JSON.stringify(copy, null, 2));
  await run('/usr/bin/zip', ['-q', temp, ...selected.map(assetPath), captionFile], { cwd: join(source, 'exports') });
  await rename(temp, join(source, `${name}.zip`));
}
if (process.argv[2]) {
  const target = join(resolve(process.argv[2]), 'social'); await mkdir(target, { recursive: true });
  for (const path of ['index.html', 'studio.js', 'studio.css', 'components', 'data', 'templates', 'motion', 'assets', 'vendor',
    'KONKERS-Campaign.zip', 'KONK-New-Features.zip', 'KONK-Twi-First.zip']) await cp(join(source, path), join(target, path), { recursive: true });
  for (const entry of entries) {
    const path = join('exports', assetPath(entry)); await mkdir(join(target, path, '..'), { recursive: true });
    await cp(join(source, path), join(target, path));
  }
  for (const name of ['manifest.json', 'campaign-copy.json']) await cp(join(source, 'exports', name), join(target, 'exports', name));
  console.log(`Published ${entries.length} finished assets to ${target}`);
}
