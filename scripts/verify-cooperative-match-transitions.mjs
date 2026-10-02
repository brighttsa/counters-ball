import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:4189/play/');
  await page.waitForFunction(() => window.__countersBall?.actions);
  const parity = await page.evaluate(async () => {
    await document.fonts.ready;
    const THREE = await import('three');
    const { CAMPAIGN_LEVELS, HOME_TEAM } = await import('/src/levels/campaign-level-definitions.js');
    const { buildLevelStage, prepareLevelStage } = await import('/src/scene/level-stage-builder-and-disposal.js?v=2');
    const hash = bytes => { let value = 2166136261; for (const byte of bytes) value = Math.imul(value ^ byte, 16777619); return value >>> 0; };
    function signature(stage) {
      const result = [];
      stage.group.traverse(o => {
        const attributes = Object.entries(o.geometry?.attributes ?? {}).map(([key, value]) => [key, hash(new Uint8Array(value.array.buffer))]);
        const maps = (Array.isArray(o.material) ? o.material : [o.material]).filter(Boolean).map(material =>
          Object.entries(material).filter(([, value]) => value?.isTexture).map(([key, texture]) => {
            const canvas = texture.image;
            return [key, canvas?.width, canvas?.height, canvas?.getContext ? hash(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data) : null];
          }));
        result.push([o.type, o.position.toArray(), o.rotation.toArray(), o.scale.toArray(), attributes, maps]);
      });
      return result;
    }
    const verified = [];
    for (const level of CAMPAIGN_LEVELS) {
      const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0, 1, 10);
      const renderer = { toneMappingExposure: 1 };
      const options = { scene, renderer, camera: new THREE.PerspectiveCamera(), level, homeTeam: HOME_TEAM, awayTeam: level.opponent.team };
      const sync = buildLevelStage(options), expected = signature(sync);
      sync.dispose();
      const staged = await prepareLevelStage(options, { yieldTask: async () => {} });
      if (scene.children.length !== 0) throw Error('Incomplete stage attached before activation');
      const actual = signature(staged);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        const index = expected.findIndex((value, i) => JSON.stringify(value) !== JSON.stringify(actual[i]));
        throw Error(`Scene changed: ${level.id} at ${index}: ${JSON.stringify(expected[index])} versus ${JSON.stringify(actual[index])}`);
      }
      staged.activate(); staged.dispose();
      if (scene.children.length !== 0) throw Error('Stage leaked');
      verified.push(level.id);
    }
    return verified;
  });
  assert.equal(parity.length, 6);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  await page.locator('#boot-start').dispatchEvent('click');
  await page.evaluate(() => window.__countersBall.actions['play-practice']());
  const portraitMs = await page.evaluate(() => { const t = performance.now(); document.getElementById('portrait-play').click(); return performance.now() - t; });
  await page.waitForFunction(() => !window.__countersBall.app.building && window.__countersBall.app.session.level.practice);
  const replayMs = await page.evaluate(() => { const t = performance.now(); window.__countersBall.actions.replay(); return performance.now() - t; });
  await page.screenshot({ path: '/tmp/konk-transition-status-mobile.png' });
  await page.waitForFunction(() => !window.__countersBall.app.building && window.__countersBall.app.session.rules.phase !== 'waiting');
  const cancelled = await page.evaluate(async () => {
    const { app, actions } = window.__countersBall, before = app.session;
    actions.replay();
    const paused = app.paused;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    if (before.input.selected || app.paused !== paused) throw Error('Previous match accepted input during construction');
    document.querySelector('.match-transition-status button').click();
    await new Promise(resolve => setTimeout(resolve, 200));
    return !app.building && !document.querySelector('.match-transition-status').open && app.session === before;
  });
  assert.equal(cancelled, true);
  const nextMs = await page.evaluate(() => {
    const { app, actions, progress } = window.__countersBall;
    app.mode = 'campaign'; app.levelIndex = 0; progress.stars.schoolyard = 3;
    const t = performance.now(); actions['next-level'](); return performance.now() - t;
  });
  await page.waitForFunction(() => !window.__countersBall.app.building && window.__countersBall.app.session.level.id === 'kiosk');
  for (const duration of [portraitMs, replayMs, nextMs]) assert.ok(duration < 200, `Blocking action: ${duration}ms`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: '/tmp/konk-cooperative-transition-mobile.png' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => window.__countersBall.actions.replay());
  await page.waitForFunction(() => !window.__countersBall.app.building);
  await page.screenshot({ path: '/tmp/konk-cooperative-transition-desktop.png' });
  assert.deepEqual(errors, []);
  console.log({ parity, portraitMs, replayMs, nextMs, cancelled, errors });
} finally { await browser.close(); }
