import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { posters, formats } from '../../social/data/campaign.js';
import { openRenderer, run } from './render-exports.mjs';
const output = fileURLToPath(new URL('../../social/exports/', import.meta.url));
await mkdir(output, { recursive: true });
const renderer = await openRenderer(`http://127.0.0.1:${process.env.SOCIAL_PORT || 4186}`);
const manifest = [];
try {
  for (const format of Object.keys(formats)) for (const config of posters) {
    const path = join(output, format, `${config.id}.png`);
    manifest.push(await renderer.render(config, format, path)); console.log(config.id, format);
  }
  for (const config of posters.filter(p => p.motion)) {
    for (const format of config.motionFormats || ['portrait']) {
      const path = join(output, 'motion', `${config.id}-${format}.mp4`);
      manifest.push(await renderer.render(config, format, path, 'mp4')); console.log(config.id, 'motion', format);
    }
  }
  await writeFile(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await writeFile(join(output, 'campaign-copy.json'), JSON.stringify(posters, null, 2));
  await run('/usr/bin/zip', ['-q', '-r', '../KONKERS-Campaign.zip', '.'], { cwd: output });
} finally { await renderer.close(); }
