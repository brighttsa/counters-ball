import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { posters, formats } from '../../social/data/campaign.js';
import { openRenderer, run } from './render-exports.mjs';
const output = fileURLToPath(new URL('../../social/exports/', import.meta.url));
const config = posters.find(p => p.id === '19-twi-first'), entries = [];
const renderer = await openRenderer();
try {
  for (const format of Object.keys(formats)) {
    entries.push(await renderer.render(config, format, join(output, format, `${config.id}.png`)));
    console.log('Twi first', format);
  }
  for (const format of ['portrait', 'story']) entries.push(await renderer.render(config, format, join(output, 'motion', `${config.id}-${format}.mp4`), 'mp4'));
  const manifestPath = join(output, 'manifest.json'), previous = JSON.parse(await readFile(manifestPath));
  await writeFile(manifestPath, JSON.stringify([...previous.filter(p => p.id !== config.id), ...entries], null, 2));
  await writeFile(join(output, 'campaign-copy.json'), JSON.stringify(posters, null, 2));
  const pack = join(output, 'twi-first'); await mkdir(pack, { recursive: true });
  await writeFile(join(pack, 'caption.txt'), config.caption);
  await writeFile(join(pack, 'template.json'), JSON.stringify(config, null, 2));
  for (const entry of entries) await copyFile(entry.path, join(pack, `${entry.id}-${entry.format}.${entry.kind}`));
  await run('/usr/bin/zip', ['-q', '-r', '../../KONK-Twi-First.zip', '.'], { cwd: pack });
  await run('/usr/bin/zip', ['-q', '-r', '../KONKERS-Campaign.zip', '.'], { cwd: output });
  console.log('Twi-first ZIP and complete campaign ZIP updated');
} finally { await renderer.close(); }
