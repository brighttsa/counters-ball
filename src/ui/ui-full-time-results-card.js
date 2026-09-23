// Full-time results card: outcome title, the score chalked in team colours,
// the three star goals revealed one by one, and a closing line in the
// neighbourhood's voice. Nothing here may name one venue's set piece, because
// every Street Legends venue shares this card.
import { SIDE_HOME } from '../core/pitch-dimensions-and-constants.js';
import { streetLegendRetryCue } from '../levels/street-legends-flow-retry-cues.js';

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
    if (legend) return legend.act === legend.acts ? `Street Legend of ${level.place}!` : `${kid} gives you the table. Next act unlocked.`;
    return isFinalVenue ? 'Champion of the tables! Every pitch conquered.' : improved ? 'New best on this pitch!' : 'Nice flicking.';
  }
  if (legend && level.rules.awayFlickLimit === 0) return 'Out of flicks. Read the table and set the ball up for it.';
  if (legend?.act === 2) {
    const cue = streetLegendRetryCue(level);
    if (cue) return `Next try: ${cue}`;
  }
  return winner === null ? 'Level on goals: you need a win for stars.' : `${kid} keeps the bragging rights. Run it back.`;
}

/** "You win!", "Kwame wins", or on the 2-Player Table the winning seat's name. */
export function fullTimeTitle({ winner }, level, mode, names) {
  if (winner === null) return 'Draw!';
  if (mode === 'versus') return `${names[winner]} wins!`;
  return winner === SIDE_HOME ? 'You win!' : `${level.opponent.kid} wins`;
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
    $('results-opponent').textContent = level.legend ? `Street Legends · ${level.name} · Act ${level.legend.act}: ${level.actTitle}`
      : versus ? `${level.name} · ${names.home} vs ${names.away}` : `${level.name} · Accra Reds vs ${level.opponent.team.name}`;

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
        this.timers.push(setTimeout(() => {
          list.children[i].classList.add('earned');
          list.children[i].setAttribute('aria-label', `${labels[i]}: earned`);
          onStar(i);
        }, STAR_REVEAL_DELAY_MS + i * STAR_REVEAL_STEP_MS));
      });
    }

    $('results-note').textContent = fullTimeNote(result, level, mode, { improved, isFinalVenue });
    $('results-lines').replaceChildren(...lines.map((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    }));
    // Two players want the same table again at once: Rematch leads, and it's one tap.
    const replay = $('btn-replay');
    replay.textContent = versus ? rematchLabel : 'Replay';
    replay.classList.toggle('btn-primary', versus);
    $('btn-next').hidden = !hasNext;
    $('btn-next').textContent = level.legend ? 'Next Act' : 'Next Pitch';
  }
}
