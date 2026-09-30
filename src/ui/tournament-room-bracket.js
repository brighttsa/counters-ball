const node = (tag, className, text) => {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
};

export function renderTournamentBracket(target, room, mySeat) {
  target.replaceChildren();
  const seats = room.seats;
  const matches = room.tournament?.matches;
  if (!matches) {
    target.append(node('h3', 'tournament-heading', 'Players'));
    for (let i = 1; i <= 4; i++) {
      const id = `p${i}`;
      const player = seats[id];
      const row = node('p', 'tournament-player', player?.name ?? `Waiting for player ${i}`);
      row.append(node('span', 'tournament-state', player ? (player.ready ? 'Ready' : 'Not ready') : 'Open'));
      if (id === mySeat) row.classList.add('is-you');
      target.append(row);
    }
    return;
  }
  target.append(node('h3', 'tournament-heading', room.phase === 'ended' ? 'Final standings' : 'Knockout bracket'));
  for (const [id, title] of [['semi-a', 'Semifinal 1'], ['semi-b', 'Semifinal 2'], ['final', 'Final']]) {
    const match = matches[id];
    const row = node('div', 'tournament-match', '');
    row.append(node('span', 'tournament-round', title));
    const home = seats[match.home]?.name ?? 'TBD';
    const away = seats[match.away]?.name ?? 'TBD';
    row.append(node('strong', 'tournament-pair', `${home}  vs  ${away}`));
    row.append(node('span', 'tournament-score', match.score ? `${match.score[0]} : ${match.score[1]}` : match.home && match.away ? 'In play' : 'Awaiting semifinal winners'));
    if (match.home === mySeat || match.away === mySeat) row.classList.add('is-you');
    if (match.winner) row.classList.add('is-finished');
    target.append(row);
  }
  if (!room.tournament.standings) return;
  const standings = node('ol', 'tournament-standings', '');
  for (const entry of room.tournament.standings) {
    const item = node('li', entry.seat === mySeat ? 'is-you' : '', `${entry.place === 1 ? 'Champion' : entry.place === 2 ? 'Runner-up' : 'Third'} · ${seats[entry.seat].name}`);
    standings.append(item);
  }
  target.append(standings);
}
