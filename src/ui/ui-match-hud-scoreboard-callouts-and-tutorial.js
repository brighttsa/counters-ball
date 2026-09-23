// In-match HUD: scoreboard (on screen or chalked on the table), flick counts,
// turn banner, event callouts, replay label and the tutorial hand.
import { SIDE_HOME, SIDE_AWAY } from '../core/pitch-dimensions-and-constants.js';
import { KineticEventCallout } from './ui-kinetic-event-callout.js';

const $ = (id) => document.getElementById(id);

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
    $('hud-style-toggle').dataset.value = this.style === 'chalk' ? 'Chalk' : 'Broadcast';
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
    this.setFlicks(level.rules.flickLimit, level.rules.awayFlickLimit ?? level.rules.flickLimit);
    this.setObjective(level.objective ?? null);
    this.hideTutorial();
  }

  /** Scoreboard names; the 2-Player Table sets the typed seat names at kick-off. */
  setNames(home, away) {
    $('hud-home-name').textContent = home.toUpperCase();
    $('hud-away-name').textContent = away.toUpperCase();
  }

  /** Street Legends objective + live signal reading; hidden on classic tables. */
  setObjective(text) {
    const el = $('hud-objective');
    el.hidden = !text;
    el.textContent = text ?? '';
  }

  setScore(scores, poppedSide) {
    for (const side of [SIDE_HOME, SIDE_AWAY]) {
      const el = $(`score-${side}`);
      el.textContent = scores[side];
      if (side === poppedSide) restartAnimation(el, 'pop');
    }
    this.table?.setScore(scores);
  }

  setTurn(side, text) {
    $('turn-dot-home').classList.toggle('inactive', side !== SIDE_HOME);
    $('turn-dot-away').classList.toggle('inactive', side !== SIDE_AWAY);
    const banner = $('turn-banner');
    banner.textContent = text;
    banner.style.setProperty('--turn-color', side === SIDE_AWAY ? 'var(--away-color)' : 'var(--home-color)');
    banner.dataset.side = side;
    banner.classList.add('show');
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
