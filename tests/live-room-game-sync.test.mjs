import test from 'node:test';
import assert from 'node:assert/strict';
import { startLiveRoomGameSync } from '../src/ui/live-match-room-game-sync.js';
import { packLetter } from '../src/core/message-match-turn-letter-codec.js';
const tick = () => new Promise(resolve => setImmediate(resolve));
function packed(seq) {
  const rules = { phase: 'aiming', turn: 'away', scores: { home: 0, away: 0 }, flicksUsed: { home: 0, away: 0 },
    lastScorer: null, tiebreak: null, tiebreakBonus: { home: 0, away: 0 } };
  return packLetter({ levelId: 'schoolyard', seq, by: 'away', names: { home: 'Ama', away: 'Kofi' },
    rulesBefore: rules, rulesAfter: rules, before: [0, 0, 1, 1], flicks: [{ entry: 0, vx: 1, vy: 0, after: [0, 0, 1, 1] }] });
}
test('sync serializes socket turns and skips already restored snapshots', async () => {
  let deliver, release; const events = [];
  const letters = { seq: 1, replay: async letter => {
    events.push(`start${letter.seq}`); if (letter.seq === 2) await new Promise(resolve => { release = resolve; });
    events.push(`end${letter.seq}`);
  } };
  const sync = startLiveRoomGameSync({ api: '', id: '', mySide: 'home', letters, hud: { event() {} },
    socketFactory: (_, __, callback) => { deliver = callback; return { connected: true, close() {} }; },
    readTurn: async () => ({ letter: packed(1) }) });
  try {
    await tick(); deliver({ type: 'turn', letter: packed(2) }); deliver({ type: 'turn', letter: packed(3) });
    await tick(); assert.deepEqual(events, ['start2']); release(); await tick();
    assert.deepEqual(events, ['start2', 'end2', 'start3', 'end3']);
    deliver({ type: 'turn', letter: packed(3) }); await tick(); assert.equal(events.length, 4);
  } finally { sync.close(); }
});
test('failed replay retries via HTTP even while socket remains connected', async () => {
  let deliver, attempts = 0, reads = 0;
  const sync = startLiveRoomGameSync({ api: '', id: '', mySide: 'home', hud: { event() {} },
    letters: { seq: 0, replay: async () => { if (++attempts === 1) throw Error('Transient replay failure'); } },
    socketFactory: (_, __, callback) => { deliver = callback; return { connected: true, close() {} }; },
    readTurn: async () => ({ letter: ++reads === 1 ? null : packed(1) }) });
  try {
    await tick(); deliver({ type: 'turn', letter: packed(1) }); await tick();
    await new Promise(resolve => setTimeout(resolve, 1300)); assert.equal(attempts, 2);
  } finally { sync.close(); }
});
