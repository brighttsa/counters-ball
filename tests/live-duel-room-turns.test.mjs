import test from 'node:test';
import assert from 'node:assert/strict';
import { duelRoomTurn } from '../match-server/src/live-duel-room-turns.js';
import { createRoom, joinRoom, setReady } from '../match-server/src/live-match-room-rules.js';
import { packLetter } from '../src/core/message-match-turn-letter-codec.js';

function fixture() {
  const room = createRoom({ levelId: 'schoolyard', homeName: 'Ama' }); joinRoom(room, { name: 'Kofi' });
  setReady(room, 'home', true); setReady(room, 'away', true);
  const values = new Map();
  const ctx = { storage: { get: async key => values.get(key), setAlarm: async () => {},
    put: async entries => { for (const [key, value] of Object.entries(entries)) values.set(key, structuredClone(value)); } },
    getWebSockets: () => [] };
  const before = { phase: 'aiming', turn: 'home', scores: { home: 0, away: 0 }, flicksUsed: { home: 0, away: 0 },
    lastScorer: null, tiebreak: null, tiebreakBonus: { home: 0, away: 0 } };
  const after = { ...before, turn: 'away', flicksUsed: { home: 1, away: 0 } };
  const make = (seq, by, rulesBefore, rulesAfter) => packLetter({ levelId: 'schoolyard', names: { home: 'Ama', away: 'Kofi' },
    seq, by, before: [0, 0, 1, 1], rulesBefore, rulesAfter, flicks: [{ entry: 0, vx: 1, vy: 0, after: [0, 0, 1, 1] }] });
  const a = make(1, 'home', before, after);
  const b = make(2, 'away', after, { ...after, phase: 'ended', turn: 'away', flicksUsed: { home: 1, away: 1 } });
  const post = (letter, token = room.seats[letter.by === 'h' ? 'home' : 'away'].token) =>
    duelRoomTurn(ctx, new Request('https://match/room/turn', { method: 'POST', body: JSON.stringify({ letter, token }) }), room);
  return { room, values, a, b, post };
}
test('lost acknowledgements can retry after later turns and full time without overwriting the ledger', async () => {
  const { room, values, a, b, post } = fixture();
  assert.equal((await post(a)).status, 201); assert.equal((await post(b)).status, 200);
  assert.equal(room.phase, 'ended');
  assert.equal((await post(a)).status, 200); assert.equal((await post(b)).status, 200);
  assert.deepEqual(values.get('room:letter'), b);
  assert.equal(values.get('room:turn:1').k, 1);
});
test('duplicate receipt still requires the original seat and exact turn contents', async () => {
  const { a, post } = fixture(); await post(a);
  assert.equal((await post(a, 'wrong')).status, 403);
  assert.equal((await post({ ...a, m: 'changed' })).status, 409);
});
