import { createRequire } from 'node:module';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'docs/app-store/screenshots');
const baseUrl = process.env.KONK_SCREENSHOT_URL || 'http://127.0.0.1:4182/';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const formats = [
  { name: 'iphone-6.9', output, viewport: { width: 440, height: 956 }, scale: 3 },
  { name: 'iphone-6.5', output: join(output, 'iphone-6.5'), viewport: { width: 428, height: 926 }, scale: 3 },
  { name: 'ipad-12.9', output: join(output, 'ipad-12.9'), viewport: { width: 1024, height: 1366 }, scale: 2, tablet: true },
];

const shots = [
  { file: '01-flick-bank-score.png', mode: 'versus', index: 0, view: 'broadcast', aim: true,
    kicker: 'BOTTLE-CAP FOOTBALL', title: 'FLICK. BANK. SCORE.', subtitle: 'Built for touch, angles and tiny moments of glory.' },
  { file: '02-street-legends.png', mode: 'legends', index: 10, view: 'street',
    kicker: 'STREET LEGENDS', title: 'THE RULES MOVE.', subtitle: 'Master toll gates, shifting goals and improvised pitches.' },
  { file: '03-six-pitches.png', screen: 'venues', preview: 15,
    kicker: 'ACROSS GHANA', title: 'SIX PITCHES. SIX STORIES.', subtitle: 'From schoolyard dust to the lights of Jamestown.' },
  { file: '04-two-player.png', mode: 'versus', index: 5, view: 'broadcast',
    kicker: '2-PLAYER TABLE', title: 'SETTLE IT SIDE BY SIDE.', subtitle: 'Pass the phone. First to two wins.' },
  { file: '05-camera-replay.png', mode: 'versus', index: 2, view: 'tactical',
    kicker: 'YOUR VIEW. YOUR READ.', title: 'SEE EVERY ANGLE.', subtitle: 'Broadcast, Tactical and Street cameras put you in control.' },
];

async function newGamePage(browser, format) {
  const page = await browser.newPage({ viewport: format.viewport, deviceScaleFactor: format.scale });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__countersBall?.actions));
  await page.locator('#boot-start').dispatchEvent('click');
  await page.waitForFunction(() => !document.body.classList.contains('awaiting-start'));
  await page.evaluate(() => {
    const game = window.__countersBall;
    game.progress.practiceSkipped = true;
    game.progress.versusNames = { home: 'AMA', away: 'KOFI' };
    [...game.levels, ...game.legends].forEach(level => { game.progress.stars[level.id] = 3; });
  });
  return page;
}

async function captureSource(browser, shot, sourcePath, format) {
  const page = await newGamePage(browser, format);
  await page.addStyleTag({ content: `
    .tutorial-tip,.tutorial-hand,.tutorial-keys,.keyboard-aim-help,
    .player-camera kbd,.camera-keys-note{display:none!important}
  ` });
  if (shot.screen === 'venues') {
    await page.evaluate((index) => {
      const game = window.__countersBall;
      game.actions['play-legends']();
      game.actions['preview-level']({ dataset: { index: String(index) } });
    }, shot.preview);
    await page.waitForTimeout(2600);
  } else {
    await page.evaluate(({ mode, index }) => {
      const game = window.__countersBall;
      game.app.mode = mode;
      game.actions['select-level']({ dataset: { index: String(index) } });
    }, shot);
    await page.locator('#portrait-play').click();
    await page.waitForFunction(() => Boolean(window.__countersBall.app.session));
    await page.evaluate(() => window.__countersBall.actions['kick-off']());
    await page.waitForTimeout(3200);
    await page.evaluate((view) => window.__countersBall.actions['choose-setting']({
      dataset: { choice: 'view', value: view },
    }), shot.view);
    await page.waitForTimeout(1800);
    if (shot.aim) { await page.keyboard.press('Space'); await page.waitForTimeout(400); }
  }
  await page.screenshot({ path: sourcePath });
  await page.close();
}

async function compose(browser, shot, sourcePath, format) {
  const image = (await readFile(sourcePath)).toString('base64');
  const font = (await readFile(join(root, 'vendor/fonts/anton-regular.ttf'))).toString('base64');
  const logo = (await readFile(join(root, 'assets/konk-logo.svg'))).toString('base64');
  const page = await browser.newPage({ viewport: format.viewport, deviceScaleFactor: format.scale });
  const layout = format.tablet
    ? { inset: 64, top: 64, logo: 246, logoGap: 24, kicker: 18, title: 72, copy: 24, titleWidth: 760, copyWidth: 650, rule: 8 }
    : { inset: 28, top: 37, logo: 154, logoGap: 22, kicker: 12, title: 44, copy: 16, titleWidth: 380, copyWidth: 330, rule: 6 };
  await page.setContent(`<!doctype html><style>
    @font-face{font-family:Anton;src:url(data:font/ttf;base64,${font}) format('truetype')}
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#111}
    body{font-family:Arial,sans-serif;color:#fdf6e6;letter-spacing:0}
    .game{position:absolute;inset:0;background:url(data:image/png;base64,${image}) center/cover no-repeat}
    .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,12,11,.98) 0,rgba(8,12,11,.9) 17%,rgba(8,12,11,.2) 33%,transparent 53%,rgba(8,12,11,.08) 100%)}
    .copy{position:absolute;z-index:2;left:${layout.inset}px;right:${layout.inset}px;top:${layout.top}px;text-shadow:0 2px 12px rgba(0,0,0,.8)}
    .brand-logo{display:block;width:${layout.logo}px;height:auto;margin:0 0 ${layout.logoGap}px;filter:drop-shadow(0 4px 10px rgba(0,0,0,.4))}
    .kicker{font-size:${layout.kicker}px;font-weight:800;color:#f8d744;margin-bottom:7px}
    h1{font:${layout.title}px/.98 Anton;margin:0;max-width:${layout.titleWidth}px;letter-spacing:0}
    p{font-size:${layout.copy}px;line-height:1.32;margin:13px 0 0;max-width:${layout.copyWidth}px;font-weight:600;color:#f7f0df}
    .rule{position:absolute;left:0;top:0;width:100%;height:${layout.rule}px;background:#f8d744}
  </style><div class="game"></div><div class="shade"></div><div class="rule"></div>
  <div class="copy"><img class="brand-logo" src="data:image/svg+xml;base64,${logo}" alt="KONK!">
  <div class="kicker">${shot.kicker}</div><h1>${shot.title}</h1><p>${shot.subtitle}</p></div>`);
  await page.screenshot({ path: join(format.output, shot.file) });
  await page.close();
}

const browser = await chromium.launch({ headless: true, executablePath: chrome });
try {
  for (const format of formats) {
    const sourceDir = join(tmpdir(), 'konk-app-store-screenshots', format.name);
    await rm(sourceDir, { recursive: true, force: true });
    await mkdir(sourceDir, { recursive: true });
    await mkdir(format.output, { recursive: true });
    for (const shot of shots) {
      const sourcePath = join(sourceDir, shot.file);
      await captureSource(browser, shot, sourcePath, format);
      await compose(browser, shot, sourcePath, format);
      console.log(`Created ${format.name}/${shot.file}`);
    }
    await rm(sourceDir, { recursive: true, force: true });
  }
} finally {
  await browser.close();
}
