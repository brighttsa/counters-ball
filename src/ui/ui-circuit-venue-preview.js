const $ = (id) => document.getElementById(id);

export function fillVenuePreview(level, index, unlocked, mode, stars, conditions) {
  const versus = mode === 'versus';
  const canEnter = unlocked || versus;
  $('circuit-match-number').textContent = `Ghana / Match ${String(index + 1).padStart(2, '0')}`;
  $('circuit-venue-name').textContent = level.name;
  $('circuit-venue-place').textContent = level.place;
  $('circuit-venue-opponent').textContent = versus ? `Accra Reds vs ${level.opponent.team.name}`
    : `${level.opponent.kid} / ${level.opponent.team.name} / ${level.opponent.difficulty}`;
  $('circuit-venue-conditions').textContent = conditions;
  $('circuit-venue-rules').textContent = `First to ${level.rules.goalsToWin} / ${level.rules.flickLimit} flicks each`;
  $('circuit-venue-note').textContent = level.blurb;
  $('circuit-venue-stars').textContent = versus ? '2-player table' : `${stars} / 3 stars earned`;
  const enter = $('circuit-enter');
  enter.dataset.index = String(index);
  enter.disabled = !canEnter;
  enter.setAttribute('aria-describedby', 'circuit-lock-note');
  $('circuit-lock-note').textContent = canEnter ? '' : `Win match ${index} to enter this venue.`;
  for (const button of $('level-grid').querySelectorAll('[data-index]')) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.index) === index));
  }
}
