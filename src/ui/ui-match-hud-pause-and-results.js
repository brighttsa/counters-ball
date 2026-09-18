// In-match HUD (scoreboard, flick counts, turn banner, goal banner, tutorial
// hand) and the full-time results card with stars revealed one by one.
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
    this.resultTimers = [];
  }

  show(visible) {
    this.root.hidden = !visible;
    if (!visible) { this.hideTutorial(); this.clearEvents(); }
  }

  reset(level, homeTeam, awayTeam, versus) {
    $('hud-home-name').textContent = versus ? homeTeam.name : 'YOU';
    $('hud-away-name').textContent = versus ? awayTeam.name : level.opponent.kid.toUpperCase();
    this.root.style.setProperty('--home-color', homeTeam.hudColor);
    this.root.style.setProperty('--away-color', awayTeam.hudColor);
    $('score-home').textContent = '0';
    $('score-away').textContent = '0';
    this.clearEvents();
    this.lowAttention.clear();
    this.setHeat(0, 0);
    $('turn-banner').textContent = '';
    this.setFlicks(level.rules.flickLimit, level.rules.flickLimit);
    this.hideTutorial();
  }

  setScore(scores, poppedSide) {
    for (const side of [SIDE_HOME, SIDE_AWAY]) {
      const el = $(`score-${side}`);
      el.textContent = scores[side];
      if (side === poppedSide) restartAnimation(el, 'pop');
    }
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

  setHeat(home, away) {
    for (const [side, value] of [[SIDE_HOME, home], [SIDE_AWAY, away]]) {
      const heat = Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100);
      const el = $(`heat-${side}`);
      el.textContent = `${side === SIDE_HOME ? 'Home' : 'Away'} ${heat}`;
      el.style.setProperty('--heat', `${heat}%`);
      el.setAttribute('aria-label', `${side} heat: ${heat} percent`);
    }
  }

  replay(active, label = 'Replay') {
    $('replay-controls').hidden = !active;
    $('replay-label').textContent = label;
  }

  showTutorial(x, y) {
    const hand = $('tutorial-hand');
    hand.hidden = false;
    hand.style.setProperty('--x', `${x.toFixed(1)}px`);
    hand.style.setProperty('--y', `${y.toFixed(1)}px`);
    const tip = hand.querySelector('.tutorial-tip');
    const viewport = window.visualViewport;
    const left = (viewport?.offsetLeft ?? 0) + 16;
    const top = (viewport?.offsetTop ?? 0) + 16;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    tip.style.width = `${Math.max(0, Math.min(280, width - 32))}px`;
    // The cap stays world-anchored; its caption must remain inside the viewport.
    const tipX = Math.max(left, Math.min(x - tip.offsetWidth / 2, left + width - 32 - tip.offsetWidth));
    const below = y + 74;
    const desiredY = below + tip.offsetHeight > top + height - 32 ? y - tip.offsetHeight - 32 : below;
    const tipY = Math.max(top, Math.min(desiredY, top + height - 32 - tip.offsetHeight));
    tip.style.left = `${tipX - x}px`;
    tip.style.top = `${tipY - y}px`;
  }

  hideTutorial() {
    $('tutorial-hand').hidden = true;
  }

  cancelResultReveal() {
    this.resultTimers.forEach(clearTimeout);
    this.resultTimers = [];
  }

  fillResults(result, level, mode, { hasNext, improved, isFinalVenue, onStar }) {
    this.cancelResultReveal();
    const versus = mode === 'versus';
    const { winner, scores, starFlags } = result;
    const kid = level.opponent.kid;
    const title = $('results-title');

    title.textContent = winner === null ? 'Draw!'
      : versus ? `${winner === SIDE_HOME ? 'Accra Reds' : level.opponent.team.name} win!`
        : winner === SIDE_HOME ? 'You win!' : `${kid} wins`;
    title.dataset.outcome = winner === null ? 'draw' : versus || winner === SIDE_HOME ? 'win' : 'loss';
    $('results-score').textContent = `${scores.home} – ${scores.away}`;
    $('results-opponent').textContent = `${level.name} · Accra Reds vs ${level.opponent.team.name}`;

    const labels = ['Win the match', 'Keep a clean sheet', `Win within ${level.rules.threeStarFlicks} flicks`];
    const list = $('results-stars');
    list.hidden = versus;
    list.replaceChildren(...labels.map((label) => {
      const li = document.createElement('li');
      li.innerHTML = '<span class="result-star" aria-hidden="true">★</span><span class="result-star-label"></span>';
      li.lastChild.textContent = label;
      return li;
    }));
    if (!versus) {
      starFlags.forEach((earned, i) => {
        if (!earned) return;
        this.resultTimers.push(setTimeout(() => {
          list.children[i].classList.add('earned');
          list.children[i].setAttribute('aria-label', `${labels[i]}: earned`);
          onStar(i);
        }, 650 + i * 450));
      });
    }

    let note = '';
    if (!versus && winner === SIDE_HOME) note = isFinalVenue ? 'Champion of the tables! Every pitch conquered.' : improved ? 'New best on this pitch!' : 'Nice flicking.';
    else if (!versus) note = winner === null ? 'Level on goals: you need a win for stars.' : `${kid} keeps the bragging rights. Run it back.`;
    $('results-note').textContent = note;
    $('btn-next').hidden = !hasNext;
  }
}
