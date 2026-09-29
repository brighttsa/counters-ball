import { createRequire } from 'node:module';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'docs/app-store/screenshots');
const sourceDir = join(output, 'sources');
const baseUrl = process.env.KONK_SCREENSHOT_URL || 'http://127.0.0.1:4182/';
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const viewport = { width: 440, height: 956 };

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

async function newGamePage(browser) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 3 });
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

async function captureSource(browser, shot, sourcePath) {
  const page = await newGamePage(browser);
  await page.addStyleTag({ content: '.tutorial-tip,.tutorial-hand,.keyboard-aim-help{display:none!important}' });
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

async function compose(browser, shot, sourcePath) {
  const image = (await readFile(sourcePath)).toString('base64');
  const font = (await readFile(join(root, 'vendor/fonts/anton-regular.ttf'))).toString('base64');
  const page = await browser.newPage({ viewport, deviceScaleFactor: 3 });
  await page.setContent(`<!doctype html><style>
    @font-face{font-family:Anton;src:url(data:font/ttf;base64,${font}) format('truetype')}
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#111}
    body{font-family:Arial,sans-serif;color:#fdf6e6;letter-spacing:0}
    .game{position:absolute;inset:0;background:url(data:image/png;base64,${image}) center/cover no-repeat}
    .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,12,11,.98) 0,rgba(8,12,11,.9) 17%,rgba(8,12,11,.2) 33%,transparent 53%,rgba(8,12,11,.08) 100%)}
    .copy{position:absolute;z-index:2;left:28px;right:28px;top:37px;text-shadow:0 2px 12px rgba(0,0,0,.8)}
    .brand{display:flex;align-items:center;gap:9px;margin-bottom:28px;font:18px/1 Anton;color:#f8d744}
    .cap{width:25px;height:25px;border:4px solid #f8d744;border-radius:50%;box-shadow:inset 0 0 0 3px #172b45}
    .kicker{font-size:12px;font-weight:800;color:#f8d744;margin-bottom:7px}
    h1{font:44px/.98 Anton;margin:0;max-width:380px;letter-spacing:0}
    p{font-size:16px;line-height:1.32;margin:13px 0 0;max-width:330px;font-weight:600;color:#f7f0df}
    .rule{position:absolute;left:0;top:0;width:100%;height:6px;background:#f8d744}
  </style><div class="game"></div><div class="shade"></div><div class="rule"></div>
  <div class="copy"><div class="brand"><span class="cap"></span>KONK!</div>
  <div class="kicker">${shot.kicker}</div><h1>${shot.title}</h1><p>${shot.subtitle}</p></div>`);
  await page.screenshot({ path: join(output, shot.file) });
  await page.close();
}

await rm(sourceDir, { recursive: true, force: true });
await mkdir(sourceDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: chrome });
try {
  for (const shot of shots) {
    const sourcePath = join(sourceDir, shot.file);
    await captureSource(browser, shot, sourcePath);
    await compose(browser, shot, sourcePath);
    console.log(`Created ${shot.file}`);
  }
} finally {
  await browser.close();
}
