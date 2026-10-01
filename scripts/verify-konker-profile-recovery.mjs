import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const errors = [];
async function lobby(page) {
  await page.goto(process.env.KONK_VERIFY_URL ?? 'http://localhost:4181/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__countersBall?.actions, null, { timeout: 60000 });
  await page.locator('#boot-start').dispatchEvent('click');
  await page.locator('[data-action="play-friend"]').click();
}
try {
  const pages = [];
  for (const [width, height] of [[1280, 800], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage(); pages.push(page);
    page.on('pageerror', error => errors.push(error.message)); await lobby(page);
  }
  const [a, b] = pages;
  await a.locator('#live-room-name').fill('Bright');
  await a.locator('#konker-profile-controls summary').click();
  await a.locator('#konker-profile-save').click();
  await a.locator('#konker-profile-status').filter({ hasText: 'Profile: Bright' }).waitFor();
  const downloadPromise = a.waitForEvent('download'); await a.locator('#konker-profile-export').click();
  const download = await downloadPromise; assert.equal(download.suggestedFilename(), 'KONK-private-profile-recovery.txt');
  const code = await a.evaluate(() => { const p = JSON.parse(localStorage.getItem('konk:profile:v1')); return `${p.id}.${p.secret}`; });
  await b.locator('#konker-profile-controls summary').click();
  await b.locator('#konker-profile-code').fill(code); await b.locator('#konker-profile-restore').click();
  await b.locator('#konker-profile-status').filter({ hasText: 'Profile: Bright' }).waitFor();
  assert.equal(await b.locator('#live-room-name').inputValue(), 'Bright');
  for (const [i, page] of pages.entries()) {
    await page.screenshot({ path: `/tmp/konk-profile-${i ? 'mobile' : 'desktop'}.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await b.locator('#live-room-name').fill('Rival');
  await a.locator('[data-action="live-room-create"]').click();
  await a.locator('#live-room-status').filter({ hasText: 'Room created' }).waitFor();
  const id = await a.locator('#live-room-code').inputValue();
  await b.locator('#live-room-code').fill(id); await b.locator('[data-action="live-room-join"]').click();
  await b.locator('#live-room-status').filter({ hasText: 'You joined' }).waitFor();
  for (const page of pages) await page.locator('[data-action="live-room-ready"]').click();
  await Promise.all(pages.map(page => page.waitForFunction(() => window.__countersBall.app.session?.options.controllers?.away !== 'ai' && window.__countersBall.app.session?.options.localSide)));
  await a.evaluate(() => { const s = window.__countersBall.app.session;
    s.flick(s.entries.find(entry => entry.side === 'home'), s.entries[0].body.vel.clone().set(.6, .1)); });
  await b.waitForFunction(() => window.__countersBall.app.session.rules.turn === 'away' && window.__countersBall.app.session.rules.phase === 'aiming');
  await a.reload({ waitUntil: 'domcontentloaded' });
  await a.waitForFunction(() => window.__countersBall?.app.session?.rules.turn === 'away', null, { timeout: 60000 });
  assert.equal(new URL(a.url()).searchParams.get('room'), id);
  const turns = await Promise.all(pages.map(page => page.evaluate(() => window.__countersBall.app.session.rules.snapshot())));
  assert.deepEqual(turns[0], turns[1]);
  const tables = await Promise.all(pages.map(page => page.evaluate(() => { const s = window.__countersBall.app.session;
    return [...s.entries.map(e => e.body), s.ballBody].flatMap(body => [body.pos.x, body.pos.y]); })));
  tables[0].forEach((value, i) => assert.ok(Math.abs(value - tables[1][i]) < .01));
  assert.deepEqual(errors, []);
  console.log('Desktop/mobile profile creation, private export, cross-browser restoration and accepted-turn reload passed.');
} finally { await browser.close(); }
