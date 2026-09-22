// Menu screens: title (animated inline logo), level select (cardboard venue
// tickets with stars and locks) and the pre-match intro card. One delegated
// click handler routes every [data-action] button to the app.
import { totalStars } from '../core/save-progress-local-storage.js';
import { fillVenuePreview } from './ui-circuit-venue-preview.js';
import { getVenueVisualProfile } from '../scene/venue-visual-profiles.js';
import { paintInkCapPoster } from './ink-impact-cap-poster.js';

const $ = (id) => document.getElementById(id);
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);
const LIGHT = { midday: 'Midday sun', 'late-afternoon': 'Late afternoon',
  'golden-hour': 'Golden hour', harmattan: 'Harmattan dust', 'night-bulb': 'Under the bulb' };
const conditions = (level) => `${LIGHT[level.lighting] ?? level.lighting} · ${
  getVenueVisualProfile(level.backdrop).surfaceLabel} · ${
  level.obstacles.length ? `${level.obstacles.length} obstacles` : 'Open table'}`;

export class MenuScreens {
  /** @param onAction (action: string, element: HTMLElement) => void */
  constructor(onAction) {
    this.screens = Object.fromEntries([...document.querySelectorAll('[data-screen]')].map((el) => [el.dataset.screen, el]));
    this.current = null;
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (el && !el.disabled) onAction(el.dataset.action, el);
    });
    this.loadLogo();
    paintInkCapPoster($('home-cap-print'));
  }

  async loadLogo() {
    const holder = $('title-logo');
    try {
      const response = await fetch('assets/counters-ball-logo.svg');
      if (!response.ok) throw new Error(`logo ${response.status}`);
      holder.innerHTML = await response.text(); // our own bundled asset, inlined so page fonts apply
    } catch {
      holder.innerHTML = '<h1 class="logo-fallback">Counters Ball 3D</h1>';
    }
  }

  show(name) {
    document.body.dataset.screen = name ?? 'match';
    for (const [key, el] of Object.entries(this.screens)) el.classList.toggle('is-active', key === name);
    this.current = name;
    const focusable = name && this.screens[name]?.querySelector('.btn-primary:not([hidden]):not([disabled]), .level-card:not([disabled]), .btn:not([disabled])');
    focusable?.focus({ preventScroll: true });
  }

  setTitleStars(earned, max) {
    $('title-stars').textContent = earned > 0
      ? `★ ${earned} of ${max} stars collected`
      : 'Six pitches. Six neighbourhood legends.';
  }

  setSoundIcon(muted) {
    const button = $('sound-toggle');
    button.classList.toggle('muted', muted);
    button.setAttribute('aria-pressed', String(!muted));
    button.setAttribute('aria-label', muted ? 'Sound is off' : 'Sound is on');
  }

  renderLevels(levels, progress, mode, isUnlocked) {
    document.body.classList.toggle('ink-menus', mode === 'legends');
    this.circuitProgress = progress;
    const versus = mode === 'versus';
    $('levels-heading').textContent = mode === 'legends' ? 'Street Legends' : versus ? 'The Circuit · 2 Players' : 'The Circuit';
    $('levels-star-total').textContent = versus ? '' : `★ ${totalStars(progress, levels)} / ${levels.length * 3}`;
    $('level-grid').innerHTML = levels.map((level, i) => {
      const unlocked = isUnlocked(i);
      const stars = progress.stars[level.id] ?? 0;
      const starRow = versus ? '' : `<span class="level-stars" aria-label="${stars} of 3 stars">${
        [0, 1, 2].map((n) => `<i class="${n < stars ? 'on' : ''}">★</i>`).join('')}</span>`;
      return `<button class="level-card${unlocked ? '' : ' locked'}" data-action="preview-level" data-index="${i}"
        aria-pressed="false" style="--accent:${level.opponent.team.hudColor}">
        <span class="level-number">${level.legend?.act ?? i + 1}</span>
        <span class="level-name">${escapeHtml(level.actTitle ?? level.name)}</span>
        <span class="level-place">${escapeHtml(level.legend ? `${level.name} · Act ${level.legend.act}` : level.place)}</span>
        ${starRow}
        ${unlocked ? '' : '<span class="level-lock">Locked · Preview</span>'}
      </button>`;
    }).join('');
  }

  previewLevel(level, index, unlocked, mode) {
    fillVenuePreview(level, index, unlocked, mode, this.circuitProgress?.stars[level.id] ?? 0, conditions(level));
  }

  fillIntro(level, index, total, mode, homeTeam) {
    const versus = mode === 'versus';
    const { rules, opponent } = level;
    const legend = level.legend;
    $('intro-number').textContent = legend ? `Street Legends / ${level.name} / Act ${legend.act} of ${legend.acts}`
      : `The Circuit / Match ${String(index + 1).padStart(2, '0')} of ${total}`;
    $('intro-title').textContent = legend ? level.actTitle : level.name;
    $('intro-place').textContent = level.place;
    $('intro-blurb').textContent = versus ? 'Two players, one table. Take turns on the same screen.' : level.blurb;

    const home = $('intro-home'), away = $('intro-away');
    home.textContent = versus ? homeTeam.name : 'You';
    away.textContent = versus ? opponent.team.name : opponent.kid;
    home.style.setProperty('--chip', homeTeam.hudColor);
    away.style.setProperty('--chip', opponent.team.hudColor);

    const lines = level.introLines ? [...level.introLines]
      : [`First to ${rules.goalsToWin} goal${rules.goalsToWin > 1 ? 's' : ''} · ${rules.flickLimit} flicks each`, conditions(level)];
    if (level.obstacles.length && !legend) lines.push('Obstacles on the table: play the rebounds');
    if ((level.frictionScale ?? 1) > 1) lines.push('Dusty surface: caps stop sooner');
    if (!versus) lines.push('★ Win', '★ Keep a clean sheet', `★ Win within ${rules.threeStarFlicks} flicks`);
    const list = $('intro-rules');
    list.replaceChildren(...lines.map((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      if (text.startsWith('★')) li.className = 'star-goal';
      return li;
    }));
  }
}
