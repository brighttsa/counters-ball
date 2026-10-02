import { createRequire } from 'node:module';
import { posters, formats } from '../../social/data/campaign.js';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  for (const [width, height] of [[1440, 1000], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', e => console.log('PAGE ERROR', e.message));
    page.on('response', r => { if (r.status() >= 400) console.log('FAILED', r.url(), r.status()); });
    await page.goto('http://127.0.0.1:4186/social/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `/tmp/konk-social-studio-${width}.png`, fullPage: true });
    console.log(await page.evaluate(() => ({ title: document.getElementById('current-title').textContent,
      fonts: [...document.fonts].map(f => [f.family, f.status]), overflow: document.documentElement.scrollWidth > innerWidth,
      glyphs: document.fonts.check('100px Anton', 'YƐ KONKI! ɛ') })));
    await page.close();
  }
  for (const [format, dimensions] of Object.entries(formats)) {
    const page = await browser.newPage({ viewport: { width: 1440, height: Math.ceil(360 * dimensions.height / dimensions.width + 26) * 5 } });
    await page.setContent(`<style>body{margin:0;background:#dde2dc;display:grid;grid-template-columns:repeat(4,1fr);gap:0}figure{margin:0;padding:7px}img{width:100%;display:block}figcaption{font:12px Arial;margin:5px}</style>${posters.map(p => `<figure><img src="http://127.0.0.1:4186/social/exports/${format}/${p.id}.png"><figcaption>${p.id}</figcaption></figure>`).join('')}`);
    await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
    await page.screenshot({ path: `/tmp/konk-social-contact-${format}.png`, fullPage: true }); await page.close();
  }
} finally { await browser.close(); }
