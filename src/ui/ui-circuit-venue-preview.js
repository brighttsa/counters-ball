const $ = (id) => document.getElementById(id);
const capitalize = (text) => String(text).charAt(0).toUpperCase() + String(text).slice(1);

export function fillVenuePreview(level, index, unlocked, mode, stars, conditions) {
  const versus = mode === 'versus';
  const canEnter = unlocked || versus;
  const legend = level.legend; // Street Legends act: show the act, not the circuit match
  $('circuit-match-number').textContent = legend ? `Street Legends / ${level.name} / Act ${legend.act} of ${legend.acts}`
    : `Ghana / Match ${String(index + 1).padStart(2, '0')}`;
  $('circuit-venue-name').textContent = legend ? level.actTitle : level.name;
  $('circuit-venue-place').textContent = level.place;
  $('circuit-venue-opponent').textContent = versus ? `Accra Reds vs ${level.opponent.team.name}`
    : `${level.opponent.kid} · ${level.opponent.team.name} · ${capitalize(level.opponent.difficulty)}`;
  $('circuit-venue-conditions').textContent = conditions;
  $('circuit-venue-rules').textContent = legend ? level.introLines[0]
    : `First to ${level.rules.goalsToWin} · ${level.rules.flickLimit} flicks each`;
  $('circuit-venue-note').textContent = level.blurb;
  $('circuit-venue-stars').textContent = versus ? '2-player table' : `${stars} / 3 stars earned`;
  const enter = $('circuit-enter');
  enter.dataset.index = String(index);
  enter.disabled = !canEnter;
  enter.setAttribute('aria-describedby', 'circuit-lock-note');
  $('circuit-lock-note').textContent = canEnter ? ''
    : legend ? `Win Act ${legend.act - 1} to enter this act.` : `Win match ${index} to enter this venue.`;
  for (const button of $('level-grid').querySelectorAll('[data-index]')) {
    const selected = Number(button.dataset.index) === index;
    button.setAttribute('aria-pressed', String(selected));
    if (selected) button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}
