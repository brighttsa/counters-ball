import { createRequire } from 'node:module';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { formats } from '../../social/data/campaign.js';
import { cachedExport, renderConfigKey, sourceFingerprint } from './export-cache.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
export const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, options); let error = '';
  child.stderr.on('data', chunk => { error += chunk; });
  child.on('error', reject); child.on('close', code => code ? reject(Error(error || `${command} failed`)) : resolve());
});
export async function openRenderer(base = 'http://127.0.0.1:4186') {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  return {
    async render(config, format, path, kind = 'png', progress = () => {}) {
      const { width, height } = formats[format];
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      let frames;
      try {
        const sourceHash = await sourceFingerprint();
        progress({ phase: 'Preparing artwork', frame: 0, frames: 0 });
        await page.goto(`${base}/social/?export=1`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.renderSocialPoster);
        await page.evaluate(async ({ config, format }) => window.renderSocialPoster(config, format), { config, format });
        const overflow = await page.evaluate(() => {
          const root = document.body.querySelector(':scope > .poster'), box = root.getBoundingClientRect();
          return [...root.querySelectorAll('.headline,.subheadline,.eyebrow,.poster-footer,.twi-question,.twi-closing')].flatMap(el => {
            const b = el.getBoundingClientRect();
            return b.right > box.right + 1 || b.bottom > box.bottom + 1 || el.scrollWidth > el.clientWidth + 1 ? [el.className] : [];
          });
        });
        if (overflow.length || errors.length) throw Error(`Invalid composition ${config.id}/${format}: ${[...overflow, ...errors].join(', ')}`);
        await mkdir(join(path, '..'), { recursive: true });
        if (kind === 'png') await page.locator('body > .poster').screenshot({ path, animations: 'disabled' });
        else {
          frames = await mkdtemp(join(tmpdir(), 'konk-motion-'));
          const count = (config.motionDuration || 3) * 30;
          for (let i = 0; i < count; i++) {
            await page.evaluate(time => window.setSocialMotionFrame(time), i / 30);
            await page.locator('body > .poster').screenshot({ path: join(frames, `${String(i).padStart(4, '0')}.png`) });
            progress({ phase: 'Rendering motion', frame: i + 1, frames: count });
          }
          progress({ phase: 'Encoding MP4', frame: count, frames: count });
          await run('/opt/homebrew/bin/ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', join(frames, '%04d.png'),
            '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path]);
        }
        return { id: config.id, format, width, height, path, kind, overflow, errors,
          renderKey: renderConfigKey(config, format, kind), sourceHash };
      } finally { await page.close(); if (frames) await rm(frames, { recursive: true, force: true }); }
    },
    close: () => browser.close(),
  };
}
export async function exportRequest({ configs, format, kind, pack = false }, base, progress = () => {}) {
  const work = await mkdtemp(join(tmpdir(), 'konk-social-')); let renderer;
  try {
    for (const [i, config] of configs.entries()) {
      const report = detail => progress({ ...detail, index: i + 1, total: configs.length, id: config.id });
      const ready = await cachedExport(config, format, kind), path = join(work, `${config.id}-${format}.${kind}`);
      if (ready) { report({ phase: 'Using finished export', frame: 0, frames: 0 }); await copyFile(ready, path); }
      else { renderer ??= await openRenderer(base); await renderer.render(config, format, path, kind, report); }
    }
    if (configs.length === 1 && !pack) return await readFile(join(work, `${configs[0].id}-${format}.${kind}`));
    await writeFile(join(work, 'captions.json'), JSON.stringify(configs.map(({ id, title, caption }) => ({ id, title, caption })), null, 2));
    progress({ phase: 'Packaging ZIP', index: configs.length, total: configs.length, frame: 0, frames: 0 });
    await run('/usr/bin/zip', ['-q', '-j', join(work, 'collection.zip'), ...configs.map(c => join(work, `${c.id}-${format}.${kind}`)), join(work, 'captions.json')]);
    return await readFile(join(work, 'collection.zip'));
  } finally { await renderer?.close(); await rm(work, { recursive: true, force: true }); }
}
