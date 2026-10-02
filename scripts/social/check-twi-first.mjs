import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { posters } from '../../social/data/campaign.js';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const config = posters.find(p => p.id === '19-twi-first');
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:4186/social/', { waitUntil: 'networkidle' });
    if (width > 850) await page.locator('[data-poster="19-twi-first"]').click();
    else await page.locator('#mobile-poster').selectOption('19-twi-first');
    await page.waitForFunction(() => document.querySelector('#current-title').textContent.includes('Twi First'));
    assert.equal(await page.locator('#caption').inputValue(), config.caption);
    assert.equal(await page.locator('#question').inputValue(), config.question);
    assert.equal(await page.locator('#closing').inputValue(), config.closing);
    assert.equal(await page.locator('#composition-count').textContent(), '19');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `/tmp/konk-twi-studio-${width}.png`, fullPage: true });
    if (width === 1440) {
      const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export-png').click()]);
      await download.saveAs('/tmp/konk-twi-download.png');
      assert.equal(download.suggestedFilename(), '19-twi-first-portrait.png');
    }
    assert.deepEqual(errors, []); await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await page.goto('http://127.0.0.1:4186/social/?export=1');
  await page.evaluate(c => window.renderSocialPoster(c, 'portrait'), config);
  for (const time of [.35, 1.8, 3.2, 5]) {
    await page.evaluate(t => window.setSocialMotionFrame(t), time);
    await page.locator('body>.poster').screenshot({ path: `/tmp/konk-twi-motion-${time}.png` });
    const state = await page.evaluate(() => {
      const root = document.querySelector('body>.poster');
      return { impact: Number(root.querySelector('.chalk-impact').style.opacity),
        closing: Number(root.querySelector('.twi-closing').style.opacity),
        end: root.querySelector('.twi-end-card').style.display,
        clean: Number(root.querySelector('.clean-konk').style.opacity) };
    });
    if (time === 1.8) assert.equal(state.impact, 1);
    if (time === 3.2) { assert.equal(state.clean, 1); assert.equal(state.closing, 1); }
    if (time === 5) assert.equal(state.end, 'flex');
  }
  console.log('Twi exact copy, gallery, mobile/desktop, PNG download and motion sequence pass');
} finally { await browser.close(); }
