// Exports the KONK! brand concept as standalone SVG and PNG files.
//
// The concept page (../konk-brand-identity.html) is the single source of the
// artwork: headless Chrome runs its drawing script, this file lifts the finished
// shared <defs> and applications out of the DOM, wraps each in a self-contained
// SVG (Anton embedded as base64, so text renders anywhere), then has Chrome
// rasterise each SVG to PNG.
//
// Run from anywhere:  node "plans/visuals/konk-brand/build-konk-brand-assets.mjs"
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, statSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const PAGE = join(OUT, '..', 'konk-brand-identity.html');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs headless Chrome in a throwaway profile (never the owner's real one). With a fresh profile Chrome
 * finishes its work but can linger, so we stop it once `done()` says the output is complete.
 */
async function chrome(args, done) {
  const profile = mkdtempSync(join(tmpdir(), 'konk-chrome-'));
  const child = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', `--user-data-dir=${profile}`, '--virtual-time-budget=3000', ...args], { stdio: ['ignore', 'pipe', 'ignore'] });
  let stdout = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  const exited = new Promise((resolve) => child.on('exit', resolve));
  try {
    for (let waited = 0; !done(stdout); waited += 200) {
      if (waited > 45000) throw new Error(`Chrome timed out: ${args.at(-1)}`);
      if (child.exitCode !== null && !done(stdout)) throw new Error(`Chrome exited without output: ${args.at(-1)}`);
      await sleep(200);
    }
    await sleep(300); // let a just-written file finish flushing
    return stdout;
  } finally {
    child.kill('SIGKILL');
    await exited;
    rmSync(profile, { recursive: true, force: true });
  }
}

// A PNG counts as written once it exists with a non-zero size that has stopped growing.
function pngReady(path) {
  let last = -1;
  return () => {
    if (!existsSync(path)) return false;
    const size = statSync(path).size;
    const stable = size > 0 && size === last;
    last = size;
    return stable;
  };
}

function extract(dom, pattern, label) {
  const match = pattern.exec(dom);
  if (!match) throw new Error(`Could not find ${label} in the rendered concept page`);
  return match[1];
}

const dom = await chrome(['--dump-dom', pathToFileURL(PAGE).href], (out) => out.includes('</html>'));
const defs = extract(dom, /<svg class="defs"[^>]*>([\s\S]*?)<\/svg>/, 'shared defs');
const keyArt = extract(dom, /<svg class="frame" viewBox="0 0 1600 900"[^>]*>([\s\S]*?)<\/svg>/, 'key art');
const icon = extract(dom, /<svg width="256" height="256" viewBox="0 0 1024 1024"[^>]*>([\s\S]*?)<\/svg>/, 'app icon');
const font = readFileSync(join(OUT, 'anton-latin.woff2')).toString('base64');

// xlink:href alongside href, for older editors (Illustrator, Inkscape 0.x) that only read xlink.
const withXlink = (svg) => svg.replace(/<use href="(#[^"]+)"/g, '<use href="$1" xlink:href="$1"');

function standalone({ width, height, viewBox, title, body }) {
  return withXlink(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="${viewBox}">
<title>${title}</title>
<style>@font-face { font-family: 'Anton'; src: url(data:font/woff2;base64,${font}) format('woff2'); }</style>
${defs}
${body}
</svg>
`);
}

// Logo lockups sit on transparency; the key-art placement is reused so proportions match.
const LOGO_BODY = `<g transform="translate(150 530) rotate(-4) scale(.98)"><use href="#wordmark"/></g>
<g transform="translate(376 632) rotate(-2)"><use href="#descriptor"/></g>`;
const WORDMARK_BODY = '<g transform="rotate(-4 660 -150)"><use href="#wordmark"/></g>';
// App stores apply their own corner mask, so the store icon is full-bleed; the preview keeps the rounded corners.
const iconFor = (rounded) => (rounded ? icon : icon.replace(/(<clipPath[^>]*>\s*<rect[^>]*?) rx="228"/, '$1 rx="0"'));

const assets = [
  { name: 'konk-logo', width: 1390, height: 680, viewBox: '110 60 1390 680', title: 'KONK! Bottle-cap football', body: LOGO_BODY, png: [{ scale: 2 }] },
  { name: 'konk-wordmark', width: 1420, height: 560, viewBox: '-40 -450 1420 560', title: 'KONK!', body: WORDMARK_BODY, png: [{ scale: 2 }] },
  { name: 'konk-app-icon', width: 1024, height: 1024, viewBox: '0 0 1024 1024', title: 'KONK! app icon', body: iconFor(true),
    png: [{ scale: 1, suffix: '-1024', sizes: [512, 180] }] },
  { name: 'konk-app-icon-store', width: 1024, height: 1024, viewBox: '0 0 1024 1024', title: 'KONK! app icon (full-bleed for app stores)', body: iconFor(false),
    png: [{ scale: 1, suffix: '-1024', background: '141312ff' }] }, // stores reject icons with transparency
  { name: 'konk-key-art', width: 1600, height: 900, viewBox: '0 0 1600 900', title: 'KONK! Bottle-cap football. Tiny pitch. Big moments.', body: keyArt,
    png: [{ scale: 2 }] },
];

for (const asset of assets) {
  const svgPath = join(OUT, `${asset.name}.svg`);
  writeFileSync(svgPath, standalone(asset));
  for (const { scale, suffix = '', background = '00000000', sizes = [] } of asset.png) {
    const pngPath = join(OUT, `${asset.name}${suffix}.png`);
    // Render at 1x CSS size and let the device scale factor supply the pixels; transparent where the art is.
    rmSync(pngPath, { force: true });
    await chrome([`--screenshot=${pngPath}`, `--window-size=${asset.width},${asset.height}`, `--force-device-scale-factor=${scale}`,
      `--default-background-color=${background}`, pathToFileURL(svgPath).href], pngReady(pngPath));
    console.log(`${asset.name}${suffix}.png  (${Math.round(asset.width * scale)}×${Math.round(asset.height * scale)})`);
    // Chrome will not render far below 1x, so small icon sizes are resampled from the full render.
    for (const size of sizes) {
      const smallPath = join(OUT, `${asset.name}-${size}.png`);
      execFileSync('/usr/bin/sips', ['-z', String(size), String(size), pngPath, '--out', smallPath], { stdio: 'ignore' });
      console.log(`${asset.name}-${size}.png  (${size}×${size})`);
    }
  }
  console.log(`${asset.name}.svg`);
}

// The game's own copies: the home-screen logo, the phone home-screen icon, and a link-preview image
// small enough for chat apps (WhatsApp skips previews much over ~300 KB).
const GAME_ASSETS = join(OUT, '..', '..', '..', 'assets');
copyFileSync(join(OUT, 'konk-logo.svg'), join(GAME_ASSETS, 'konk-logo.svg'));
copyFileSync(join(OUT, 'konk-app-icon-180.png'), join(GAME_ASSETS, 'konk-app-icon-180.png'));
execFileSync('/usr/bin/sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '78', '-z', '675', '1200',
  join(OUT, 'konk-key-art.png'), '--out', join(GAME_ASSETS, 'konk-share-preview.jpg')], { stdio: 'ignore' });
console.log(`game assets → ${GAME_ASSETS}: konk-logo.svg, konk-app-icon-180.png, konk-share-preview.jpg`);
