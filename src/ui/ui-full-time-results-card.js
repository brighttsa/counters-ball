// Full-time results card: outcome title, the score chalked in team colours,
// the three star goals revealed one by one, and a closing line in the
// neighbourhood's voice. Nothing here may name one venue's set piece, because
// every Street Legends venue shares this card.
import { SIDE_HOME } from '../core/pitch-dimensions-and-constants.js';
import { streetLegendRetryCue } from '../levels/street-legends-flow-retry-cues.js';
import { RESULTS_COPY, resultTitle, shotStory, starGoals } from './konk-interface-copy.js?v=3';

const $ = (id) => document.getElementById(id);
const STAR_REVEAL_DELAY_MS = 650;
const STAR_REVEAL_STEP_MS = 450;

function chalkSide(value, colour) {
  const span = document.createElement('span');
  span.className = 'chalk-side';
  span.style.setProperty('--chalk-team', colour);
  span.textContent = value;
  return span;
}

export function fullTimeNote(result, level, mode, { improved, isFinalVenue }) {
  if (mode === 'versus') return '';
  const { winner } = result;
  const kid = level.opponent.kid;
  const legend = level.legend;
  if (winner === SIDE_HOME) {
    if (legend) return legend.act === legend.acts ? `${level.place} knows your name now.` : `${kid} steps aside. Next act unlocked.`;
    return isFinalVenue ? RESULTS_COPY.classicFinal : improved ? RESULTS_COPY.improved : RESULTS_COPY.ordinaryWin;
  }
  if (legend && level.rules.awayFlickLimit === 0) return RESULTS_COPY.soloOut;
  if (legend?.act === 2) {
    const cue = streetLegendRetryCue(level);
    if (cue) return `Next shot: ${cue}`;
  }
  return winner === null ? RESULTS_COPY.drawnStars : `${kid} keeps the table. Run it back.`;
}

export function fullTimeTitle({ winner }, level, mode, names) {
  return resultTitle(winner, mode, names, level.opponent.kid);
}

function replayLabel(winner, versus, rematchLabel) {
  if (versus) return rematchLabel;
  if (winner === null) return RESULTS_COPY.settleIt;
  return winner === SIDE_HOME ? RESULTS_COPY.playAgain : RESULTS_COPY.runItBack;
}

export class FullTimeResultsCard {
  constructor() {
    this.timers = [];
  }

  /** Leaving the results early must not ding stars into the next screen. */
  cancelReveal() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  /**
   * @param names 2-Player Table seat names ({home, away}); ignored against the AI
   * @param lines extra full-time lines: the series and head-to-head record, or a friend's challenge verdict
   * @param rematchLabel 2-Player only: 'Rematch' mid-series, 'New series' once it is decided
   */
  fill(result, level, mode, { hasNext, improved, isFinalVenue, onStar, homeColour, names, lines = [], rematchLabel = 'Rematch' }) {
    this.cancelReveal();
    const versus = mode === 'versus';
    const { winner, scores, starFlags } = result;
    const title = $('results-title');
    title.textContent = fullTimeTitle(result, level, mode, names);
    title.dataset.outcome = winner === null ? 'draw' : versus || winner === SIDE_HOME ? 'win' : 'loss';
    $('results-score').replaceChildren(chalkSide(scores.home, homeColour), ' — ', chalkSide(scores.away, level.opponent.team.hudColor));
    $('results-opponent').textContent = level.legend ? `${level.name} · Act ${level.legend.act}: ${level.actTitle}`
      : versus ? `${level.name} · ${names.home} vs ${names.away}` : `${level.name} · Accra Reds vs ${level.opponent.team.name}`;

    const labels = starGoals(level.rules.threeStarFlicks);
    const list = $('results-stars');
    list.hidden = versus;
    list.replaceChildren(...labels.map((label) => {
      const li = document.createElement('li');
      li.innerHTML = '<svg class="result-star" aria-hidden="true" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" fill="currentColor"/></svg><span class="result-star-label"></span>';
      li.lastChild.textContent = label;
      return li;
    }));
    if (!versus) {
      starFlags.forEach((earned, i) => {
        if (!earned) return;
        this.timers.push(setTimeout(() => {
          list.children[i].classList.add('earned');
          list.children[i].setAttribute('aria-label', `${labels[i]}: earned`);
          onStar(i);
        }, STAR_REVEAL_DELAY_MS + i * STAR_REVEAL_STEP_MS));
      });
    }

    $('results-note').textContent = fullTimeNote(result, level, mode, { improved, isFinalVenue });
    const story = shotStory(result.shotStory, winner);
    const storyLine = document.createElement('li');
    storyLine.className = 'results-shot-story';
    storyLine.textContent = `Decisive shot · ${story}`;
    $('results-lines').replaceChildren(storyLine, ...lines.map((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    }));
    // Two players want the same table again at once: Rematch leads, and it's one tap. Solo, a win leads on to
    // the next table; after a loss or a draw (or with nothing next) Play again leads, and the menu focuses it.
    const replay = $('btn-replay');
    const nextLeads = !versus && hasNext && title.dataset.outcome === 'win';
    replay.textContent = replayLabel(winner, versus, rematchLabel);
    replay.classList.toggle('btn-primary', !nextLeads);
    $('btn-next').classList.toggle('btn-primary', nextLeads);
    $('btn-next').hidden = !hasNext;
    $('btn-next').textContent = level.legend ? 'Next act' : 'Next pitch';
  }
}
