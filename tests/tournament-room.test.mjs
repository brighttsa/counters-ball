import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, joinRoom, publicRoom, seatFor, setReady } from '../match-server/src/live-match-room-rules.js';
import { finishTournamentMatch, tournamentMatchFor, tournamentStandings } from '../match-server/src/tournament-room-rules.js';
import { tournamentTurn } from '../match-server/src/tournament-room-turns.js';
import { packLetter } from '../src/core/message-match-turn-letter-codec.js';

function fullRoom() {
  const room = createRoom({ mode: 'tournament', levelId: 'schoolyard', homeName: 'Ama', now: 100 });
  for (const name of ['Kofi', 'Esi', 'Yaw']) assert.equal(joinRoom(room, { name, now: 110 }).ok, true);
  for (const seat of ['p1', 'p2', 'p3', 'p4']) assert.equal(setReady(room, seat, true, 120).ok, true);
  return room;
}

test('four distinct tokens fill a knockout room; a fifth player cannot join', () => {
  const room = fullRoom();
  assert.equal(room.phase, 'playing');
  assert.equal(joinRoom(room, { name: 'Fifth' }).status, 409);
  assert.equal(new Set(Object.values(room.seats).map((player) => player.token)).size, 4);
  for (const seat of Object.keys(room.seats)) assert.equal(seatFor(room, room.seats[seat].token), seat);
  assert.equal(Object.values(publicRoom(room).seats).some((player) => 'token' in player), false);
});

test('semifinals are disjoint and final requires two winners', () => {
  const room = fullRoom();
  const { 'semi-a': a, 'semi-b': b, final } = room.tournament.matches;
  assert.equal(new Set([a.home, a.away, b.home, b.away]).size, 4);
  assert.equal(final.home, null);
  assert.equal(tournamentMatchFor(room, a.home), 'semi-a');
  assert.equal(tournamentMatchFor(room, b.away), 'semi-b');
  assert.equal(finishTournamentMatch(room, 'semi-a', [2, 2]), false);
  assert.equal(finishTournamentMatch(room, 'semi-a', [3, 1]), true);
  assert.equal(room.tournament.matches.final.home, a.home);
  assert.equal(tournamentMatchFor(room, a.home), null);
  assert.equal(finishTournamentMatch(room, 'semi-b', [1, 4]), true);
  assert.equal(room.tournament.matches.final.away, b.away);
  assert.equal(tournamentMatchFor(room, a.home), 'final');
  assert.equal(tournamentMatchFor(room, b.away), 'final');
  assert.equal(finishTournamentMatch(room, 'final', [2, 1]), true);
  assert.equal(room.phase, 'ended');
  assert.deepEqual(tournamentStandings(room).map(({ place }) => place), [1, 2, 3, 3]);
  assert.equal(tournamentStandings(room)[0].seat, a.home);
  assert.equal(finishTournamentMatch(room, 'final', [1, 4]), false);
});

test('a single unready player keeps the bracket locked', () => {
  const room = createRoom({ mode: 'tournament', levelId: 'schoolyard', homeName: 'Ama' });
  for (const name of ['Kofi', 'Esi', 'Yaw']) joinRoom(room, { name });
  for (const seat of ['p1', 'p2', 'p3']) setReady(room, seat, true);
  assert.equal(room.phase, 'lobby');
  assert.equal(publicRoom(room).tournament.matches, null);
  setReady(room, 'p4', true);
  assert.equal(room.phase, 'playing');
});

test('each semifinal accepts only its own seats and letter stream', async () => {
  const room = fullRoom();
  const values = new Map();
  const ctx = { storage: { get: async (key) => values.get(key), put: async (entries) => {
    for (const [key, value] of Object.entries(entries)) values.set(key, value);
  } }, getWebSockets: () => [] };
  const match = room.tournament.matches['semi-a'];
  const name = (seat) => room.seats[seat].name;
  const before = { phase: 'aiming', turn: 'home', scores: { home: 0, away: 0 }, flicksUsed: { home: 0, away: 0 },
    lastScorer: null, tiebreak: null, tiebreakBonus: { home: 0, away: 0 } };
  const after = { ...before, phase: 'ended', scores: { home: 1, away: 0 }, flicksUsed: { home: 1, away: 0 } };
  const letter = packLetter({ levelId: 'schoolyard', names: { home: name(match.home), away: name(match.away) },
    seq: 1, by: 'home', before: [0, 0, 1, 1], rulesBefore: before, rulesAfter: after,
    flicks: [{ entry: 0, vx: 1, vy: 0, after: [0, 0, 1, 1] }] });
  const request = (id, token, body = letter) => new Request(`https://match/room/turn?matchId=${id}`, {
    method: 'POST', body: JSON.stringify({ token, letter: body }),
  });
  const outsider = room.seats[room.tournament.matches['semi-b'].home].token;
  const read = (token) => new Request('https://match/room/turn?matchId=semi-a',
    { headers: { Authorization: `Bearer ${token}` } });
  assert.equal((await tournamentTurn(ctx, read(outsider), room)).status, 403);
  assert.equal((await tournamentTurn(ctx, request('semi-a', outsider), room)).status, 403);
  assert.equal((await tournamentTurn(ctx, request('final', room.seats[match.home].token), room)).status, 409);
  assert.equal((await tournamentTurn(ctx, request('semi-a', room.seats[match.home].token), room)).status, 201);
  assert.equal(room.tournament.matches['semi-a'].winner, match.home);
  assert.equal(values.has('room:letter:semi-a'), true);
  assert.equal(values.has('room:letter:semi-b'), false);
  assert.equal((await tournamentTurn(ctx, read(room.seats[match.away].token), room)).status, 200);
  assert.equal((await tournamentTurn(ctx, request('semi-a', room.seats[match.home].token), room)).status, 409);
});
