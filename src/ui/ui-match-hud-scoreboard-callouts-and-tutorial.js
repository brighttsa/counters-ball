// In-match HUD: scoreboard (on screen or chalked on the table), flick counts,
// turn banner, event callouts, replay label and the tutorial hand.
import { SIDE_HOME, SIDE_AWAY } from '../core/pitch-dimensions-and-constants.js';
import { KineticEventCallout } from './ui-kinetic-event-callout.js?v=2';
import { markChoice } from './pause-card-faces-and-setting-chips.js';

const $ = (id) => document.getElementById(id);
const TURN_CALL_MS = 1800;

function restartAnimation(el, className) {
  el.classList.remove(className);
  void el.offsetWidth; // reflow so the same animation can play again
  el.classList.add(className);
}

export class MatchHud {
  constructor() {
    this.root = $('hud');
    this.callout = new KineticEventCallout($('goal-banner'));
    this.lowAttention = new Set();
    this.table = null;
    this.style = 'chalk';
    this.tutorialSize = null;
    this.tutorialResize = new ResizeObserver(() => { this.tutorialSize = null; });
    this.tutorialResize.observe($('tutorial-hand').querySelector('.tutorial-tip'));
  }

  /** A per-match scoreboard chalked on the table; mirrors score and flicks while attached. */
  attachTableChalk(board) {
    this.table = board;
    board?.setVisible(this.style === 'chalk');
  }

  /** 'chalk' (default) puts score and flicks on the table; 'broadcast' keeps the screen scoreboard. */
  setStyle(style) {
    this.style = style === 'broadcast' ? 'broadcast' : 'chalk';
    document.body.classList.toggle('hud-chalk', this.style === 'chalk');
    markChoice('scoreboard', this.style);
    this.table?.setVisible(this.style === 'chalk');
  }

  show(visible) {
    this.root.hidden = !visible;
    if (!visible) { this.hideTutorial(); this.clearEvents(); }
  }

  reset(level, homeTeam, awayTeam, versus) {
    this.setNames(versus ? homeTeam.name : 'YOU', versus ? awayTeam.name : level.opponent.kid);
    this.root.style.setProperty('--home-color', homeTeam.hudColor);
    this.root.style.setProperty('--away-color', awayTeam.hudColor);
    $('score-home').textContent = '0';
    $('score-away').textContent = '0';
    this.table?.setScore({ home: 0, away: 0 });
    this.clearEvents();
    this.lowAttention.clear();
    $('turn-banner').textContent = '';
    clearTimeout(this.turnCallTimer);
    $('flick-meter-label').textContent = 'flicks left';
    $('flick-meter-label').classList.remove('turn-call');
    this.setFlicks(level.rules.flickLimit, level.rules.awayFlickLimit ?? level.rules.flickLimit);
    this.setObjective(level.objective ?? null);
    this.hideTutorial();
  }

  /** Scoreboard names; the 2-Player Table sets the typed seat names at kick-off. */
  setNames(home, away) {
    $('hud-home-name').textContent = home.toUpperCase();
    $('hud-away-name').textContent = away.toUpperCase();
  }

  setLocalPerspective(side, names) {
    if (!side || !names) return;
    this.setNames(side === SIDE_HOME ? 'YOU' : names.home, side === SIDE_AWAY ? 'YOU' : names.away);
    this.root.dataset.localSide = side;
  }

  /**
   * Street Legends objective; hidden on classic tables. The venue's live reading (which way the ruler turns
   * next, which lane shuts…) is chalked on the table, so on screen it is only read out to screen readers.
   */
  setObjective(text, reading = '') {
    const el = $('hud-objective');
    el.hidden = !text;
    el.textContent = text ?? '';
    if (text && reading) {
      const spoken = document.createElement('span');
      spoken.className = 'visually-hidden';
      spoken.textContent = ` · ${reading}`;
      el.append(spoken);
    }
  }

  setScore(scores, poppedSide) {
    for (const side of [SIDE_HOME, SIDE_AWAY]) {
      const el = $(`score-${side}`);
      el.textContent = scores[side];
      if (side === poppedSide) restartAnimation(el, 'pop');
    }
    this.table?.setScore(scores);
  }

  /**
   * Whose turn it is lives in the score frame: the side's bar lights, and for a moment the middle of the
   * flicks row reads "Your flick" / "Kwame lines up" in that side's colour before going back to "flicks
   * left". The turn banner stays as the screen-reader announcement only.
   */
  setTurn(side, text) {
    $('turn-dot-home').classList.toggle('inactive', side !== SIDE_HOME);
    $('turn-dot-away').classList.toggle('inactive', side !== SIDE_AWAY);
    const banner = $('turn-banner');
    banner.textContent = text;
    banner.dataset.side = side;
    const label = $('flick-meter-label');
    clearTimeout(this.turnCallTimer);
    label.textContent = text;
    label.style.setProperty('--turn-color', side === SIDE_AWAY ? 'var(--away-color)' : 'var(--home-color)');
    restartAnimation(label, 'turn-call');
    this.turnCallTimer = setTimeout(() => {
      label.textContent = 'flicks left';
      label.classList.remove('turn-call');
    }, TURN_CALL_MS);
  }

  setFlicks(home, away) {
    this.table?.setFlicks(home, away);
    for (const [side, left] of [[SIDE_HOME, home], [SIDE_AWAY, away]]) {
      const el = $(`flicks-${side}`);
      el.textContent = left;
      el.classList.toggle('low', left <= 3);
      el.setAttribute('aria-label', `${side === SIDE_HOME ? 'Home' : 'Away'}: ${left} flicks left`);
      if (left <= 3 && !this.lowAttention.has(side)) {
        this.lowAttention.add(side);
        restartAnimation(el, 'low-attention');
      } else if (left > 3) el.classList.remove('low-attention');
    }
  }

  goal(label) {
    this.callout.event('GOAL', { priority: 10, duration: 2.3, detail: label });
  }

  event(label, options = {}) { return this.callout.event(label, options); }
  update(dt) { this.callout.update(dt); }
  clearEvents() { this.callout.clear(); this.replay(false); }

  replay(active, label = 'Replay') {
    $('replay-controls').hidden = !active;
    $('replay-label').textContent = label;
  }

  showTutorial(x, y) {
    const hand = $('tutorial-hand');
    hand.hidden = false;
    hand.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    const tip = hand.querySelector('.tutorial-tip');
    const viewport = window.visualViewport;
    const left = (viewport?.offsetLeft ?? 0) + 16;
    const top = (viewport?.offsetTop ?? 0) + 16;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    const captionWidth = Math.max(0, Math.min(280, width - 32));
    if (!this.tutorialSize || this.tutorialSize.available !== captionWidth) {
      tip.style.width = `${captionWidth}px`;
      tip.style.left = '0'; tip.style.top = '0';
      this.tutorialSize = { available: captionWidth, width: tip.offsetWidth, height: tip.offsetHeight };
    }
    const size = this.tutorialSize;
    // The cap stays world-anchored; its caption must remain inside the viewport.
    const tipX = Math.max(left, Math.min(x - size.width / 2, left + width - 32 - size.width));
    const below = y + 74;
    const desiredY = below + size.height > top + height - 32 ? y - size.height - 32 : below;
    const tipY = Math.max(top, Math.min(desiredY, top + height - 32 - size.height));
    tip.style.transform = `translate(${tipX - x}px, ${tipY - y}px)`;
  }

  hideTutorial() {
    $('tutorial-hand').hidden = true;
  }
}
