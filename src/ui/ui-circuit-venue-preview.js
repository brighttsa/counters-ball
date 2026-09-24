const $ = (id) => document.getElementById(id);
const capitalize = (text) => String(text).charAt(0).toUpperCase() + String(text).slice(1);

// The act card stays short: the live table behind it already shows the venue, its light and its props,
// so the card names the act, the place, who you play and on what terms, the story, and the stars.
export function fillVenuePreview(level, index, unlocked, mode, stars) {
  const versus = mode === 'versus';
  const canEnter = unlocked || versus;
  const legend = level.legend; // Street Legends act: show the act, not the circuit match
  $('circuit-match-number').textContent = legend ? `Street Legends / ${level.name} / Act ${legend.act} of ${legend.acts}`
    : `Ghana / Match ${String(index + 1).padStart(2, '0')}`;
  $('circuit-venue-name').textContent = legend ? level.actTitle : level.name;
  $('circuit-venue-place').textContent = level.place;
  const terms = legend ? level.introLines[0] : `First to ${level.rules.goalsToWin} · ${level.rules.flickLimit} flicks each`;
  $('circuit-venue-opponent').textContent = versus ? `Accra Reds vs ${level.opponent.team.name} · ${terms}`
    : `vs ${level.opponent.kid} · ${capitalize(level.opponent.difficulty)} · ${terms}`;
  $('circuit-venue-note').textContent = level.blurb;
  const starLine = $('circuit-venue-stars');
  starLine.textContent = versus ? '2-player table' : '★'.repeat(stars) + '☆'.repeat(3 - stars);
  starLine.setAttribute('aria-label', versus ? '2-player table' : `${stars} of 3 stars earned`);
  const enter = $('circuit-enter');
  enter.dataset.index = String(index);
  enter.disabled = !canEnter;
  enter.setAttribute('aria-describedby', 'circuit-lock-note');
  $('circuit-lock-note').textContent = canEnter ? ''
    : legend ? `Win Act ${legend.act - 1} to unlock.` : `Win match ${index} to unlock.`;
  for (const button of $('level-grid').querySelectorAll('[data-index]')) {
    const selected = Number(button.dataset.index) === index;
    button.setAttribute('aria-pressed', String(selected));
    if (selected) button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}
