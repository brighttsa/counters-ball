// Menu screens: title (KONK! logo over the live table), level select (cardboard venue
// tickets with stars and locks) and the pre-match intro card. One delegated
// click handler routes every [data-action] button to the app.
import { totalStars } from '../core/save-progress-local-storage.js';
import { schoolyardReturnMemory } from '../core/schoolyard-shot-memory.js';
import { fillVenuePreview } from './ui-circuit-venue-preview.js';
import { getVenueVisualProfile } from '../scene/venue-visual-profiles.js';
import { featuredActCopy } from '../levels/featured-home-legends-act.js';
import { MENU_COPY, starRules, tableConditionCopy, titleStarsCopy } from './konk-interface-copy.js';

const $ = (id) => document.getElementById(id);
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);
const LIGHT = { midday: 'Midday sun', 'late-afternoon': 'Late afternoon',
  'golden-hour': 'Golden hour', harmattan: 'Harmattan dust', 'night-bulb': 'Under the bulb' };
const conditions = (level) => `${LIGHT[level.lighting] ?? level.lighting} · ${
  getVenueVisualProfile(level.backdrop).surfaceLabel} · ${
  tableConditionCopy(level)}`;

export class MenuScreens {
  /** @param onAction (action: string, element: HTMLElement) => void */
  constructor(onAction) {
    this.screens = Object.fromEntries([...document.querySelectorAll('[data-screen]')].map((el) => [el.dataset.screen, el]));
    this.current = null;
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (el && !el.disabled) onAction(el.dataset.action, el);
    });
    // The act strip scrolls sideways; a mouse wheel only scrolls vertically, so translate it.
    $('level-grid').addEventListener('wheel', (e) => {
      const grid = e.currentTarget;
      if (grid.scrollWidth <= grid.clientWidth || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      grid.scrollLeft += e.deltaY;
      e.preventDefault();
    }, { passive: false });
    // 2-Player names: the head-to-head line follows what's typed; Enter just closes the keyboard.
    for (const id of ['intro-name-home', 'intro-name-away']) {
      $(id).addEventListener('input', () => {
        if (this.rivalryItem && this.rivalryFor) this.rivalryItem.textContent = this.rivalryFor(this.readPlayerNames());
      });
      $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') e.currentTarget.blur(); });
    }
  }

  /** What's typed in the two seat fields, uncleaned. */
  readPlayerNames() {
    return { home: $('intro-name-home').value, away: $('intro-name-away').value };
  }

  /** A friend's "beat me" link, shown before the table it names. */
  fillChallenge(level, inviteLine) {
    $('challenge-title').textContent = 'Beat this mark';
    $('challenge-venue').textContent = `${level.legend ? `${level.name} · Act ${level.legend.act}: ${level.actTitle}` : level.name} · ${level.place}`;
    $('challenge-mark').textContent = inviteLine;
  }


  show(name) {
    document.body.dataset.screen = name ?? 'match';
    for (const [key, el] of Object.entries(this.screens)) el.classList.toggle('is-active', key === name);
    this.current = name;
    // One selector list would match in document order and land on a Back button placed before
    // the primary action (Enter on the intro would leave the match), so try each in priority order.
    const screen = name && this.screens[name];
    const focusable = screen && ['.btn-primary:not([hidden]):not([disabled])', '.level-card:not([disabled])', '.btn:not([hidden]):not([disabled])']
      .map((selector) => screen.querySelector(selector)).find(Boolean);
    focusable?.focus({ preventScroll: true });
  }

  setHomeFeature(level) {
    const copy = featuredActCopy(level);
    $('home-feature-act').textContent = copy.kicker;
    $('home-feature-venue').textContent = copy.venue;
    $('home-feature-title').textContent = copy.actTitle;
    $('home-feature-button').textContent = copy.button;
  }

  /** Until Kwame's Corner is finished or skipped, the big title button offers it instead of the featured act. */
  setFirstLaunch(first) {
    for (const el of document.querySelectorAll('.home-learn, .home-just-play')) el.hidden = !first;
    document.querySelector('.home-featured').hidden = first;
    document.querySelector('.home-secondary [data-action="play-practice"]').hidden = first; // the big button already offers it
  }

  setTitleStars(earned, max) {
    $('title-stars').textContent = titleStarsCopy(earned, max);
  }

  setSoundIcon(muted) {
    const button = $('sound-toggle');
    button.classList.toggle('muted', muted);
    button.setAttribute('aria-pressed', String(!muted));
    button.setAttribute('aria-label', muted ? 'Sound is off' : 'Sound is on');
  }

  renderLevels(levels, progress, mode, isUnlocked) {
    document.body.classList.add('ink-menus');
    this.circuitProgress = progress;
    const versus = mode === 'versus';
    $('levels-heading').textContent = mode === 'legends' ? 'Street Legends' : versus ? 'The Circuit · 2 Players' : 'The Circuit';
    $('levels-star-total').textContent = versus ? '' : `★ ${totalStars(progress, levels)} / ${levels.length * 3}`;
    $('level-grid').innerHTML = levels.map((level, i) => {
      const unlocked = isUnlocked(i);
      const stars = progress.stars[level.id] ?? 0;
      const starRow = versus ? '' : `<span class="level-stars" aria-label="${stars} of 3 stars">${
        [0, 1, 2].map((n) => `<i class="${n < stars ? 'on' : ''}">★</i>`).join('')}</span>`;
      const group = level.legend?.act === 1 ? `<span class="level-group">${escapeHtml(level.name)}</span>` : '';
      return `${group}<button class="level-card${unlocked ? '' : ' locked'}" data-action="preview-level" data-index="${i}"
        aria-pressed="false" style="--accent:${level.opponent.team.hudColor}">
        <span class="level-number">${level.legend?.act ?? i + 1}</span>
        <span class="level-name">${escapeHtml(level.actTitle ?? level.name)}</span>
        <span class="level-place">${escapeHtml(level.legend ? `Act ${level.legend.act} of ${level.legend.acts}` : level.place)}</span>
        ${starRow}
        ${unlocked ? '' : '<span class="level-lock">Locked</span>'}
      </button>`;
    }).join('');
  }

  previewLevel(level, index, unlocked, mode) {
    fillVenuePreview(level, index, unlocked, mode, this.circuitProgress?.stars[level.id] ?? 0, conditions(level));
  }

  /**
   * @param extras.names 2-Player seat names to prefill; extras.rivalryFor(rawNames) gives their head-to-head line
   * @param extras.lines extra rules-list lines shown first, e.g. a friend's challenge mark
   */
  fillIntro(level, index, total, mode, homeTeam, { names, rivalryFor, lines: extraLines = [] } = {}) {
    const versus = mode === 'versus';
    // Back buttons on the intro, pause and results name the track they return to.
    const track = level.practice ? 'Home' : mode === 'legends' ? 'Acts' : 'Pitches';
    for (const el of document.querySelectorAll('[data-track-label]')) el.textContent = el.dataset.trackLabel.replace('{track}', track);
    const { rules, opponent } = level;
    const legend = level.legend;
    $('intro-number').textContent = level.practice ? `${level.name} / Practice`
      : legend ? `Street Legends / ${level.name} / Act ${legend.act} of ${legend.acts}`
      : `The Circuit / Match ${String(index + 1).padStart(2, '0')} of ${total}`;
    $('intro-title').textContent = legend ? level.actTitle : level.name;
    $('intro-place').textContent = level.place;
    $('intro-blurb').textContent = versus ? MENU_COPY.localIntro : level.blurb;

    const home = $('intro-home'), away = $('intro-away');
    home.textContent = versus ? homeTeam.name : 'You';
    away.textContent = versus ? opponent.team.name : opponent.kid;
    home.style.setProperty('--chip', homeTeam.hudColor);
    away.style.setProperty('--chip', opponent.team.hudColor);
    $('intro-versus').hidden = versus;
    $('intro-names').hidden = !versus;
    this.rivalryFor = versus ? rivalryFor : null;
    if (versus) {
      for (const [side, team] of [['home', homeTeam], ['away', opponent.team]]) {
        $(`intro-name-${side}`).value = names?.[side] ?? '';
        $(`intro-name-${side}-team`).textContent = team.name;
        $(`intro-name-${side}-field`).style.setProperty('--chip', team.hudColor);
      }
    }

    const lines = level.introLines ? [...level.introLines]
      : [`First to ${rules.goalsToWin} goal${rules.goalsToWin > 1 ? 's' : ''} · ${rules.flickLimit} flicks each`, conditions(level)];
    if (level.obstacles.length && !legend) lines.push(MENU_COPY.obstacles);
    if ((level.frictionScale ?? 1) > 1) lines.push(MENU_COPY.dust);
    if (!versus && !level.practice) lines.push(...starRules(rules.threeStarFlicks));
    const memory = schoolyardReturnMemory(level, mode);
    if (memory) lines.unshift(memory);
    lines.unshift(...extraLines);
    const rivalry = this.rivalryFor?.(this.readPlayerNames());
    if (rivalry) lines.push(rivalry);
    const list = $('intro-rules');
    list.replaceChildren(...lines.map((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      if (text.startsWith('★')) li.className = 'star-goal';
      if (text === rivalry) li.className = 'rivalry-line';
      return li;
    }));
    this.rivalryItem = rivalry ? list.querySelector('.rivalry-line') : null;
  }
}
