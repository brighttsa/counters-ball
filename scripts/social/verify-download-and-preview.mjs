import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url), { chromium } = require('playwright'), { PNG } = require('pngjs');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4186/social/', { waitUntil: 'networkidle' });
  await page.locator('#headline').fill('WE ARE\nKONKERS.');
  await page.locator('#signature').fill('YƐ KONKI! ɛ');
  await page.waitForTimeout(200);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export-png').click()]);
  const path = '/tmp/konk-social-ui-export.png'; await download.saveAs(path);
  await page.setViewportSize({ width: 1080, height: 1350 });
  await page.evaluate(() => {
    const root = document.querySelector('#preview .poster');
    document.body.append(root); document.body.classList.add('export-mode');
    const style = document.createElement('style'); style.textContent = 'body>.poster{transform:none!important}'; document.head.append(style);
  });
  const screenshot = await page.locator('body > .poster').screenshot();
  await writeFile('/tmp/konk-social-ui-preview.png', screenshot);
  const exported = PNG.sync.read(await readFile(path)), preview = PNG.sync.read(screenshot);
  assert.equal(preview.width, exported.width); assert.equal(preview.height, exported.height);
  let different = 0, maxDelta = 0;
  for (let i = 0; i < preview.data.length; i++) {
    const delta = Math.abs(preview.data[i] - exported.data[i]);
    if (delta) different++; maxDelta = Math.max(maxDelta, delta);
  }
  // Chrome rounds rotated image samples differently after a scaled preview.
  assert.ok(maxDelta <= 1, `Preview/export channel delta ${maxDelta} exceeds raster rounding`);
  console.log(`Preview and PNG match within one 8-bit rounding step; Ɛ and ɛ retained (${different} channels)`);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('#signature').inputValue(), 'YƐ KONKI! ɛ');
  await page.locator('#reset').click();
  assert.equal(await page.locator('#signature').inputValue(), 'YƐ KONKI! 🔥');
  console.log('Edit persistence and selected-poster reset verified');
  const [zip] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.locator('#export-pack').click()]);
  await zip.saveAs('/tmp/konk-social-ui-collection.zip');
  assert.equal((await readFile('/tmp/konk-social-ui-collection.zip')).subarray(0, 2).toString(), 'PK');
  assert.deepEqual(errors, []); console.log('Collection ZIP downloaded successfully; no page errors');
  await writeFile('/tmp/konk-social-verification.json', JSON.stringify({ differentPixelChannels: different, maxChannelDelta: maxDelta, errors, download: download.suggestedFilename(), zip: zip.suggestedFilename() }));
} finally { await browser.close(); }
