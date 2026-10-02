import { formats, palettes } from '../data/campaign.js';
import { buildFeatureArt } from './feature-art.js';
const el = (tag, className, text) => {
  const node = document.createElement(tag); node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const image = (className, src, alt = '') => { const node = el('img', className); node.src = src; node.alt = alt; return node; };
export function buildPoster(config, format = 'portrait') {
  const { width, height } = formats[format]; const colors = palettes[config.palette];
  const root = el('article', `poster ${config.layout} ${format}`);
  if (config.feature) root.classList.add(`feature-${config.feature}`);
  root.setAttribute('aria-label', config.title);
  root.style.cssText = `width:${width}px;height:${height}px;--unit:${width / 1080}px;--bg:${config.background || colors.background};--fg:${config.foreground || colors.ink};--accent:${config.accent || colors.accent}`;
  const mark = image(`brand ${config.logoPosition}`, '/assets/konk-logo.svg', 'KONK!');
  root.append(mark, el('div', 'eyebrow', config.eyebrow));
  const headline = el('h1', 'headline');
  for (const line of config.headline.split('\n')) headline.append(el('span', 'line', line));
  root.append(headline);
  const art = el('div', 'art');
  const photo = image('venue', config.gameplayImage || `/social/assets/${config.venue}.png`, 'Actual KONK gameplay');
  if (config.layout === 'feature') buildFeatureArt(config, art, photo);
  else if (config.layout === 'twi-first') {
    art.append(photo, image('cap first', '/social/assets/cap-red.png'), image('ball', '/social/assets/paper-ball.png'), el('div', 'chalk-impact', ''));
    root.append(el('div', 'twi-question', config.question), el('div', 'twi-closing', config.closing));
    const end = el('div', 'twi-end-card');
    end.append(image('end-logo', '/assets/konk-logo.svg', 'KONK!'), el('div', 'end-cta', config.cta)); root.append(end);
  } else if (['gameplay', 'origin'].includes(config.layout)) art.append(photo);
  else if (config.layout !== 'movement' && config.layout !== 'slogan' && config.layout !== 'receipt' && config.layout !== 'score') {
    art.append(image('cap first', '/social/assets/cap-red.png'));
    if (config.layout === 'duel') art.append(image('cap second', '/social/assets/cap-rival.png'));
    else art.append(image('ball', '/social/assets/paper-ball.png'));
  }
  if (config.layout === 'receipt') art.append(el('div', 'receipt-mark', 'FULL TIME'), el('div', 'receipt-copy', 'PROOF\nOF PLAY.'), el('div', 'receipt-rule', '#CountersBall'));
  if (config.layout === 'score') {
    const score = el('div', 'scoreboard');
    score.append(el('div', 'score-name', config.homeName), el('strong', 'score-number', config.homeScore),
      el('div', 'score-name', config.awayName), el('strong', 'score-number', config.awayScore)); art.append(score);
  }
  root.append(art, el('div', 'subheadline', config.subheadline));
  if (config.layout === 'twi-first') {
    const copy = root.querySelector('.subheadline'); copy.textContent = '';
    config.subheadline.split('\n').forEach((text, i) => copy.append(el('span', i === 2 ? 'clean-konk' : '', text)));
  }
  const footer = el('footer', 'poster-footer'); footer.append(el('b', 'signature', config.signature), el('span', 'cta', config.cta)); root.append(footer);
  if (config.decoration) root.append(el('div', 'print-rule'), el('div', 'paper-grain'));
  root.dataset.motion = String(Boolean(config.motion));
  return root;
}
export async function readyPoster(root) {
  await document.fonts.ready;
  await Promise.all([...root.querySelectorAll('img')].map(img => img.decode()));
  fitPoster(root);
}
export function fitPoster(root) {
  const unit = parseFloat(root.style.getPropertyValue('--unit'));
  for (const line of root.querySelectorAll('.headline .line')) {
    const available = line.parentElement.clientWidth;
    let size = parseFloat(getComputedStyle(line).fontSize);
    while (line.scrollWidth > available + 1 && size > 28 * unit) { size -= 2 * unit; line.style.fontSize = `${size}px`; }
  }
}
