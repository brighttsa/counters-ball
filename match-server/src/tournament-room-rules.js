export const TOURNAMENT_SEATS = ['p1', 'p2', 'p3', 'p4'];
export const TOURNAMENT_MATCHES = ['semi-a', 'semi-b', 'final'];

export function beginTournament(room) {
  if (room.phase !== 'lobby' || !TOURNAMENT_SEATS.every((id) => room.seats[id]?.ready)) return false;
  const shuffled = [...TOURNAMENT_SEATS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  room.tournament = { matches: {
    'semi-a': { home: shuffled[0], away: shuffled[1], winner: null, score: null },
    'semi-b': { home: shuffled[2], away: shuffled[3], winner: null, score: null },
    final: { home: null, away: null, winner: null, score: null },
  } };
  room.phase = 'playing';
  return true;
}

export function tournamentMatchFor(room, seat) {
  if (room?.mode !== 'tournament' || !seat) return null;
  const matches = room.tournament?.matches;
  if (!matches) return null;
  return TOURNAMENT_MATCHES.find((id) => {
    const match = matches[id];
    return !match.winner && (match.home === seat || match.away === seat) && match.home && match.away;
  }) ?? null;
}

export function finishTournamentMatch(room, id, score) {
  const matches = room?.tournament?.matches;
  const match = matches?.[id];
  if (!TOURNAMENT_MATCHES.includes(id) || !match?.home || !match.away || match.winner) return false;
  if (!Array.isArray(score) || score.length !== 2 || !score.every((n) => Number.isInteger(n) && n >= 0) || score[0] === score[1]) return false;
  match.score = [...score];
  match.winner = score[0] > score[1] ? match.home : match.away;
  if (id === 'semi-a') matches.final.home = match.winner;
  if (id === 'semi-b') matches.final.away = match.winner;
  if (id === 'final') room.phase = 'ended';
  return true;
}

export function tournamentStandings(room) {
  const matches = room?.tournament?.matches;
  if (!matches?.final.winner) return null;
  const final = matches.final;
  return [
    { place: 1, seat: final.winner },
    { place: 2, seat: final.winner === final.home ? final.away : final.home },
    ...['semi-a', 'semi-b'].map((id) => {
      const match = matches[id];
      return { place: 3, seat: match.winner === match.home ? match.away : match.home };
    }),
  ];
}

export function publicTournament(room) {
  if (room?.mode !== 'tournament') return null;
  return { matches: room.tournament?.matches ?? null, standings: tournamentStandings(room) };
}
