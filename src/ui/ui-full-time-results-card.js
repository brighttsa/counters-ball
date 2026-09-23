// Full-time results card: outcome title, the score chalked in team colours,
// the three star goals revealed one by one, and a closing line in the
// neighbourhood's voice. Nothing here may name one venue's set piece, because
// every Street Legends venue shares this card.
import { SIDE_HOME } from '../core/pitch-dimensions-and-constants.js';

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
  return winner === null ? 'Level on goals: you need a win for stars.' : `${kid} keeps the bragging rights. Run it back.`;
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

  fill(result, level, mode, { hasNext, improved, isFinalVenue, onStar, homeColour }) {
    this.cancelReveal();
    const versus = mode === 'versus';
    const { winner, scores, starFlags } = result;
    const kid = level.opponent.kid;
    const title = $('results-title');
    title.textContent = winner === null ? 'Draw!'
      : versus ? `${winner === SIDE_HOME ? 'Accra Reds' : level.opponent.team.name} win!`
        : winner === SIDE_HOME ? 'You win!' : `${kid} wins`;
    title.dataset.outcome = winner === null ? 'draw' : versus || winner === SIDE_HOME ? 'win' : 'loss';
    $('results-score').replaceChildren(chalkSide(scores.home, homeColour), ' — ', chalkSide(scores.away, level.opponent.team.hudColor));
    $('results-opponent').textContent = level.legend ? `Street Legends · ${level.name} · Act ${level.legend.act}: ${level.actTitle}`
      : `${level.name} · Accra Reds vs ${level.opponent.team.name}`;

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
    $('btn-next').hidden = !hasNext;
    $('btn-next').textContent = level.legend ? 'Next Act' : 'Next Pitch';
  }
}
