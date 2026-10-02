import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { featurePosters } from '../../social/data/feature-campaign.js';
import { posters, formats } from '../../social/data/campaign.js';
import { openRenderer, run } from './render-exports.mjs';
const output = fileURLToPath(new URL('../../social/exports/', import.meta.url));
const pack = join(output, 'new-features'), entries = [];
await mkdir(pack, { recursive: true });
const renderer = await openRenderer(`http://127.0.0.1:${process.env.SOCIAL_PORT || 4186}`);
try {
  for (const format of Object.keys(formats)) for (const config of featurePosters) {
    const path = join(output, format, `${config.id}.png`);
    entries.push(await renderer.render(config, format, path)); console.log(config.id, format);
  }
  for (const config of featurePosters.filter(p => p.motion)) {
    const path = join(output, 'motion', `${config.id}-portrait.mp4`);
    entries.push(await renderer.render(config, 'portrait', path, 'mp4')); console.log(config.id, 'motion');
  }
  const ids = new Set(featurePosters.map(p => p.id));
  const old = JSON.parse(await readFile(join(output, 'manifest.json')));
  await writeFile(join(output, 'manifest.json'), JSON.stringify([...old.filter(e => !ids.has(e.id)), ...entries], null, 2));
  await writeFile(join(output, 'campaign-copy.json'), JSON.stringify(posters, null, 2));
  await writeFile(join(pack, 'campaign-copy.json'), JSON.stringify(featurePosters, null, 2));
  await writeFile(join(pack, 'captions.txt'), featurePosters.map(p => `${p.title}\n\n${p.caption}`).join('\n\n--------------------\n\n'));
  await writeFile(join(pack, 'README.txt'), 'KONK! New Features\n24 PNGs: six posters in four formats. Three silent four-second portrait MP4 loops.\nSpecial moves are marked coming next, not currently available.\nProfile recovery is not cloud progress sync. Table Talk is optional and private-room only.\n');
  await run('/usr/bin/zip', ['-q', '-r', join(output, '../KONK-New-Features.zip'),
    ...Object.keys(formats).flatMap(f => featurePosters.map(p => `${f}/${p.id}.png`)),
    ...featurePosters.filter(p => p.motion).map(p => `motion/${p.id}-portrait.mp4`),
    'new-features/campaign-copy.json', 'new-features/captions.txt', 'new-features/README.txt'], { cwd: output });
  console.log('New-feature pack exported');
} finally { await renderer.close(); }
