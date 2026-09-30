import { checkNextLetter, checkOpeningLetter } from './match-turn-ledger-rules.js';
import { finishTournamentMatch, TOURNAMENT_MATCHES } from './tournament-room-rules.js';
import { seatFor } from './live-match-room-rules.js';
import { broadcastLiveRoom } from './live-room-websocket-session.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status,
  headers: { 'Content-Type': 'application/json' } });

export async function tournamentTurn(ctx, request, room) {
  const id = new URL(request.url).searchParams.get('matchId');
  if (!TOURNAMENT_MATCHES.includes(id)) return json({ error: 'unknown bracket match' }, 400);
  const match = room.tournament?.matches[id];
  if (!match?.home || !match.away) return json({ error: 'bracket match is not ready' }, 409);
  const key = `room:letter:${id}`;
  if (request.method === 'GET') {
    const token = request.headers.get('Authorization')?.replace(/^Bearer /i, '');
    const seat = seatFor(room, token);
    if (seat !== match.home && seat !== match.away) return json({ error: 'not in this match' }, 403);
    const letter = await ctx.storage.get(key);
    return letter ? json({ letter, seq: letter.k }) : json({ error: 'match has not started' }, 404);
  }
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const { token, letter } = await request.json();
  const seat = seatFor(room, token);
  if (room.phase !== 'playing' || match.winner) return json({ error: 'bracket match is finished' }, 409);
  if (seat !== match.home && seat !== match.away) return json({ error: 'not in this match' }, 403);
  if (letter?.by !== (seat === match.home ? 'h' : 'a')) return json({ error: 'not your turn' }, 403);
  if (!letter || letter.l !== room.levelId || letter.n?.[0] !== room.seats[match.home].name || letter.n?.[1] !== room.seats[match.away].name) {
    return json({ error: 'match identity changed' }, 409);
  }
  const previous = await ctx.storage.get(key);
  const verdict = previous ? checkNextLetter(previous, letter) : checkOpeningLetter(letter);
  if (!verdict.ok) return json({ error: verdict.error, ...(previous ? { letter: previous, seq: previous.k } : {}) }, verdict.status);
  if (letter.ra[0] === 1 && !finishTournamentMatch(room, id, letter.ra[2])) return json({ error: 'knockout match needs a winner' }, 409);
  room.updatedAt = Date.now();
  await ctx.storage.put({ [key]: letter, room });
  broadcastLiveRoom(ctx, room, { type: 'turn', matchId: id, letter });
  return json({ seq: letter.k }, previous ? 200 : 201);
}
