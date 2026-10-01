import { readLiveRoomTurn, connectLiveRoomSocket } from '../core/live-match-room-transport.js?v=6';
import { unpackLetter } from '../core/message-match-turn-letter-codec.js';

export function startLiveRoomGameSync({ api, id, matchId = null, mySide, letters, hud, onEnded, socketFactory = connectLiveRoomSocket, readTurn = readLiveRoomTurn }) {
  let seen = letters.seq ?? 0, chain = Promise.resolve(), closed = false, needsRecovery = false;
  const receive = async (packed) => {
    if (closed || !packed || packed.k <= seen) return;
    const letter = unpackLetter(packed);
    if (!letter || (letters.levelId && letter.levelId !== letters.levelId)) return;
    if (packed.by === (mySide === 'home' ? 'h' : 'a')) {
      letters.seq = Math.max(letters.seq, letter.seq);
      letters.adopt(letter.rulesAfter, letter.flicks.at(-1).after);
      seen = Math.max(seen, letter.seq);
      needsRecovery = false;
      if (letter.rulesAfter.phase === 'ended') onEnded?.();
      return;
    }
    hud.event('OPPONENT FLICKED', { priority: 4, duration: 1.6, detail: `${letter.names[letter.by]} · Your move` });
    await letters.replay(letter);
    seen = Math.max(seen, letter.seq);
    needsRecovery = false;
    if (letter.rulesAfter.phase === 'ended') onEnded?.();
  };
  const enqueue = packed => { chain = chain.then(() => receive(packed)).catch(() => {
    needsRecovery = true;
    hud.event('RECONNECTING', { priority: 6, duration: 2, detail: 'Restoring the latest turn.' });
  }); return chain; };
  const socket = socketFactory(api, id, (message) => {
    if (message.type === 'turn' && (message.matchId ?? null) === matchId) void enqueue(message.letter);
  }, () => {});
  const timer = setInterval(async () => {
    if (socket?.connected && !needsRecovery) return;
    try { await enqueue((await readTurn(api, id, undefined, matchId)).letter); }
    catch { /* reconnecting WebSocket or HTTP fallback will retry */ }
  }, 1200);
  void readTurn(api, id, undefined, matchId).then(({ letter }) => enqueue(letter)).catch(() => {});
  return {
    noteSent(letter) { seen = Math.max(seen, letter.seq); },
    close() { closed = true; clearInterval(timer); socket?.close(); },
  };
}
