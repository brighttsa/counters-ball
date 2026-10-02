import { formats } from '../data/campaign.js';
import { exportIdentity } from '../data/export-identity.js';
import { buildPoster, readyPoster } from './poster.js';
let manifest, fontCSS;
async function embeddedFonts() {
  const fonts = [['Anton', 'anton-regular.ttf'], ['Patrick Hand', 'patrick-hand-regular.ttf']];
  return (await Promise.all(fonts.map(async ([name, file]) => {
    const response = await fetch(`/vendor/fonts/${file}`);
    if (!response.ok) throw Error('Campaign font could not load. Please retry.');
    const blob = await response.blob();
    const url = await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
    });
    return `@font-face{font-family:'${name}';font-style:normal;font-weight:400;src:url('${url}') format('truetype');}`;
  }))).join('\n');
}
const libraries = new Map();
function library(file, global) {
  if (!libraries.has(file)) libraries.set(file, new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = `/social/vendor/${file}`;
    script.onload = () => resolve(window[global]); script.onerror = () => reject(Error('Export library could not load. Please retry.'));
    document.head.append(script);
  }).catch(error => { libraries.delete(file); throw error; }));
  return libraries.get(file);
}
async function finishedAsset(config, format, kind) {
  manifest ??= fetch('/social/exports/manifest.json').then(response => {
    if (!response.ok) throw Error('Finished artwork is unavailable. Please retry.');
    return response.json();
  }).catch(error => { manifest = undefined; throw error; });
  const identity = new TextEncoder().encode(exportIdentity(config, format, kind));
  const digest = await crypto.subtle.digest('SHA-256', identity);
  const key = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
  if (!(await manifest).some(entry => entry.id === config.id && entry.format === format && entry.kind === kind && entry.renderKey === key)) return null;
  const path = kind === 'mp4' ? `motion/${config.id}-${format}.mp4` : `${format}/${config.id}.png`;
  const response = await fetch(`/social/exports/${path}`);
  if (!response.ok) throw Error('Artwork download failed. Please retry.');
  return response.blob();
}
async function renderPNG(config, format) {
  const renderer = await library('html-to-image-1.11.13.js', 'htmlToImage');
  const root = buildPoster(config, format), holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-20000px;top:0;pointer-events:none;';
  holder.append(root); document.body.append(holder);
  try {
    await readyPoster(root);
    fontCSS ??= embeddedFonts().catch(error => { fontCSS = undefined; throw error; });
    const { width, height } = formats[format];
    const blob = await renderer.toBlob(root, { width, height, canvasWidth: width, canvasHeight: height,
      pixelRatio: 1, fontEmbedCSS: await fontCSS, style: { transform: 'none' } });
    if (!blob) throw Error('Browser could not render this poster. Try Chrome or the local export service.');
    return blob;
  } finally { holder.remove(); }
}
export async function browserExport({ configs, format, kind, pack }, progress = () => {}) {
  const files = {};
  for (const [index, config] of configs.entries()) {
    progress(`Preparing ${index + 1} of ${configs.length} · ${config.title}`);
    let blob = await finishedAsset(config, format, kind);
    if (!blob && kind === 'mp4') throw Error('Custom motion exports need the local render service. Reset this poster for its finished MP4.');
    blob ??= await renderPNG(config, format);
    if (!pack) return blob;
    files[`${config.id}-${format}.${kind}`] = new Uint8Array(await blob.arrayBuffer());
  }
  const zip = await library('fflate-0.8.2.js', 'fflate');
  files['captions.json'] = zip.strToU8(JSON.stringify(configs.map(({ id, title, caption }) => ({ id, title, caption })), null, 2));
  progress('Packaging collection…');
  return new Blob([zip.zipSync(files, { level: 0 })], { type: 'application/zip' });
}
