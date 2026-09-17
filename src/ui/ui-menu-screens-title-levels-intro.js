// Menu screens: title (animated inline logo), level select (cardboard venue
// tickets with stars and locks) and the pre-match intro card. One delegated
// click handler routes every [data-action] button to the app.
import { totalStars } from '../core/save-progress-local-storage.js';

const $ = (id) => document.getElementById(id);
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);

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
    for (const [key, el] of Object.entries(this.screens)) el.classList.toggle('is-active', key === name);
    this.current = name;
    const focusable = name && this.screens[name]?.querySelector('.btn-primary:not([hidden]), .level-card:not([disabled]), .btn');
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
    const versus = mode === 'versus';
    $('levels-heading').textContent = versus ? 'Pick a Table · 2 Players' : 'Choose a Pitch';
    $('levels-star-total').textContent = versus ? '' : `★ ${totalStars(progress)} / ${levels.length * 3}`;
    $('level-grid').innerHTML = levels.map((level, i) => {
      const unlocked = isUnlocked(i);
      const stars = progress.stars[level.id] ?? 0;
      const starRow = versus ? '' : `<span class="level-stars" aria-label="${stars} of 3 stars">${
        [0, 1, 2].map((n) => `<i class="${n < stars ? 'on' : ''}">★</i>`).join('')}</span>`;
      const who = versus ? escapeHtml(level.opponent.team.name) : `vs ${escapeHtml(level.opponent.kid)}`;
      return `<button class="level-card${unlocked ? '' : ' locked'}" data-action="select-level" data-index="${i}"
        ${unlocked ? '' : 'disabled'} style="--tilt:${(((i * 37) % 5) - 2) * 0.6}deg;--accent:${level.opponent.team.hudColor};--delay:${i * 70}ms">
        <span class="level-number">${i + 1}</span>
        <span class="level-name">${escapeHtml(level.name)}</span>
        <span class="level-place">${escapeHtml(level.place)}</span>
        <span class="level-opponent">${who} · first to ${level.rules.goalsToWin}</span>
        ${starRow}
        ${unlocked ? '' : '<span class="level-lock">Win the pitch before<br>to unlock</span>'}
      </button>`;
    }).join('');
  }

  fillIntro(level, index, total, mode, homeTeam) {
    const versus = mode === 'versus';
    const { rules, opponent } = level;
    $('intro-number').textContent = `Pitch ${index + 1} of ${total}`;
    $('intro-title').textContent = level.name;
    $('intro-place').textContent = level.place;
    $('intro-blurb').textContent = versus ? 'Two players, one table. Take turns on the same screen.' : level.blurb;

    const home = $('intro-home'), away = $('intro-away');
    home.textContent = versus ? homeTeam.name : 'You';
    away.textContent = versus ? opponent.team.name : opponent.kid;
    home.style.setProperty('--chip', homeTeam.hudColor);
    away.style.setProperty('--chip', opponent.team.hudColor);

    const lines = [`First to ${rules.goalsToWin} goal${rules.goalsToWin > 1 ? 's' : ''}`, `${rules.flickLimit} flicks each`];
    if (level.obstacles.length) lines.push('Obstacles on the table: play the rebounds');
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
