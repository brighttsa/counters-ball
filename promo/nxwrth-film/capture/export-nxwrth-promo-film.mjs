// Exports the NXWRTH × KONK! film frame by frame, so every frame is drawn at its
// exact film time whatever the machine's speed, then muxes the offline audio mix.
//
//   node promo/nxwrth-film/capture/export-nxwrth-promo-film.mjs                 full film, 16:9, 1920x1080, 60 fps
//   FORMAT=9:16 FPS=30 node promo/nxwrth-film/capture/export-nxwrth-promo-film.mjs
//   node promo/nxwrth-film/capture/export-nxwrth-promo-film.mjs stills 1.3 12.6 14.5   PNG stills at those film seconds
//
// Needs the dev server on :4180, ffmpeg on PATH, and Playwright from promo-video/ (`npm i` there once).
// TAG=12.05 overrides the producer-tag time for this export.
import { createRequire } from 'node:module';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../../../promo-video/package.json', import.meta.url));
const { chromium } = require('playwright');

const SIZES = { '16:9': [1920, 1080], '9:16': [1080, 1920], '1:1': [1080, 1080] };
const format = process.env.FORMAT ?? '16:9';
const [width, height] = SIZES[format];
const fps = Number(process.env.FPS ?? 60);
const base = process.env.KONK_URL ?? 'http://localhost:4180/';
const outDir = fileURLToPath(new URL('./out/', import.meta.url));
const framesDir = `${outDir}frames-${format.replace(':', 'x')}/`;
const [mode, ...stillTimes] = process.argv.slice(2);

const query = new URLSearchParams({ export: '1', w: width, h: height, format });
if (process.env.TAG) query.set('tag', process.env.TAG);

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => console.error('page error:', error.message));
await page.goto(`${base}promo/nxwrth-film/?${query}`);
await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 120_000 });
const clip = { x: 0, y: 0, width, height };
const drawAt = (seconds) => page.evaluate((t) => window.__promo.renderAt(t), seconds);

if (mode === 'stills') {
  for (const value of stillTimes) {
    await drawAt(Number(value));
    const path = `${outDir}still-${format.replace(':', 'x')}-${Number(value).toFixed(2)}.png`;
    await page.screenshot({ path, clip });
    console.log(path);
  }
} else {
  const duration = await page.evaluate(() => window.__promo.duration);
  const total = Math.ceil(duration * fps);
  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });
  for (let i = 0; i < total; i++) {
    await drawAt(i / fps);
    await page.screenshot({ path: `${framesDir}${String(i).padStart(5, '0')}.jpg`, clip, type: 'jpeg', quality: 96 });
    if (i % 120 === 0) console.log(`frame ${i} / ${total}`);
  }
  const wavPath = `${outDir}nxwrth-konk-mix-${format.replace(':', 'x')}.wav`; // per format, so two exports can run side by side
  await writeFile(wavPath, Buffer.from(await page.evaluate(() => window.__promo.mixWavBase64()), 'base64'));
  const output = `${outDir}nxwrth-x-konk-${format.replace(':', 'x')}-${fps}fps.mp4`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(fps), '-i', `${framesDir}%05d.jpg`, '-i', wavPath,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', output]);
  console.log(output);
}
await browser.close();
