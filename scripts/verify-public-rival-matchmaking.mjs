import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const errors = [];
try {
  const pages = [];
  for (const [width, height] of [[1280, 800], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage(); pages.push(page);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:4181/?matchmaking=check', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__countersBall?.actions, null, { timeout: 60000 });
    await page.locator('#boot-start').dispatchEvent('click');
    await page.locator('[data-action="play-friend"]').click();
    await page.locator('#live-room-name').fill(width === 1280 ? 'Bright' : 'Rival');
  }
  const [a, b] = pages;
  let dropped = false;
  await a.route('**/matchmaking', async route => {
    if (!dropped) { dropped = true; return route.abort('failed'); }
    return route.continue();
  });
  await a.locator('#find-rival').click();
  await a.locator('#live-room-status').filter({ hasText: 'Connection interrupted' }).waitFor();
  await a.locator('#live-room-status').filter({ hasText: 'Waiting for another player' }).waitFor();
  await a.locator('#cancel-rival-search').click();
  await a.locator('#live-room-status').filter({ hasText: 'Search cancelled' }).waitFor();
  console.log('Dropped search request recovers; cancellation restores the lobby');
  await a.locator('#find-rival').click();
  await b.locator('#find-rival').click();
  await Promise.all(pages.map(page => page.locator('#live-room-title').filter({ hasText: 'Rival found' }).waitFor()));
  const ids = await Promise.all(pages.map(page => page.locator('#live-room-code').inputValue()));
  if (ids[0] !== ids[1]) throw Error('Different rooms');
  await b.locator('[data-action="live-room-back"]').click();
  await a.locator('#live-room-title').filter({ hasText: 'Rival left' }).waitFor();
  await a.locator('#find-rival').waitFor({ state: 'visible' });
  await b.locator('[data-action="play-friend"]').click();
  await a.locator('#find-rival').click(); await b.locator('#find-rival').click();
  await Promise.all(pages.map(page => page.locator('#live-room-title').filter({ hasText: 'Rival found' }).waitFor()));
  ids.splice(0, 2, ...await Promise.all(pages.map(page => page.locator('#live-room-code').inputValue())));
  console.log('Matched departure releases the rival to search again');
  await b.screenshot({ path: '/tmp/konk-public-rival-mobile.png' });
  await a.screenshot({ path: '/tmp/konk-public-rival-desktop.png' });
  for (const page of pages) await page.locator('[data-action="live-room-ready"]').click();
  await Promise.all(pages.map(page => page.waitForFunction(() => window.__countersBall.app.session?.options.controllers?.home !== 'ai' &&
    window.__countersBall.app.session?.level.id === 'schoolyard')));
  const state = await Promise.all(pages.map(page => page.evaluate(() => ({ level: window.__countersBall.app.session.level.id,
    options: window.__countersBall.app.session.options.controllers }))));
  await a.evaluate(() => {
    const s = window.__countersBall.app.session;
    const cap = s.entries.find(entry => entry.side === 'home');
    s.flick(cap, cap.body.vel.clone().set(.6, .1));
  });
  await b.waitForFunction(() => window.__countersBall.app.session.rules.turn === 'away' &&
    window.__countersBall.app.session.rules.phase === 'aiming');
  await b.evaluate(() => {
    const s = window.__countersBall.app.session;
    const cap = s.entries.find(entry => entry.side === 'away');
    s.flick(cap, cap.body.vel.clone().set(-.6, -.1));
  });
  await a.waitForFunction(() => window.__countersBall.app.session.rules.turn === 'home' &&
    window.__countersBall.app.session.rules.phase === 'aiming' && window.__countersBall.app.session.rules.flicksLeft('away') < 12);
  console.log('Two authenticated turns synchronized over the live match connection');
  let failedTurn = false;
  let lostAck = false;
  await a.route('**/rooms/*/turn', async route => {
    if (route.request().method() === 'POST' && !failedTurn) { failedTurn = true; return route.abort('failed'); }
    if (route.request().method() === 'POST' && route.request().postDataJSON().letter.k === 5 && !lostAck) {
      lostAck = true; await route.fetch(); return route.abort('failed');
    }
    return route.continue();
  });
  for (let turn = 2; turn < 30; turn++) {
    const side = turn % 2 === 0 ? 'home' : 'away';
    const player = side === 'home' ? a : b;
    await player.waitForFunction(side => {
      const r = window.__countersBall.app.session.rules;
      return r.phase === 'aiming' && r.turn === side;
    }, side);
    const before = await player.evaluate(side => window.__countersBall.app.session.rules.flicksUsed[side], side);
    await player.evaluate(side => {
      const s = window.__countersBall.app.session;
      const cap = s.entries.find(entry => entry.side === side);
      s.flick(cap, cap.body.vel.clone().set(side === 'home' ? .2 : -.2, 0));
    }, side);
    await pages[side === 'home' ? 1 : 0].waitForFunction(({ side, before }) => {
      const r = window.__countersBall.app.session.rules;
      return r.phase === 'ended' || (r.phase === 'aiming' && r.turn !== side &&
        r.flicksUsed[side] > before);
    }, { side, before });
    console.log('Completed turn', turn + 1);
  }
  await Promise.all(pages.map(page => page.waitForFunction(() => window.__countersBall.app.session.rules.phase === 'ended')));
  const response = await a.request.get(`http://localhost:8787/rooms/${ids[0]}`);
  const final = (await response.json()).room;
  if (final.phase !== 'ended' || !failedTurn || !lostAck) throw Error('Match did not finish or dropped request/acknowledgement was not tested');
  console.log('Full 30-turn match including tiebreak finished on both devices and server; failed turn recovered');
  console.log(JSON.stringify({ ids, state, errors }));
  if (errors.length) throw Error(errors.join('\n'));
} catch (error) {
  for (const context of browser.contexts()) for (const page of context.pages()) {
    console.log(await page.evaluate(() => {
      const s = window.__countersBall?.app.session;
      return { rules: s?.rules.snapshot(), errors: document.getElementById('live-room-status')?.textContent };
    }));
  }
  throw error;
} finally { await browser.close(); }
