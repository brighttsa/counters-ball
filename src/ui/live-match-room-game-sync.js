import { readLiveRoomTurn, connectLiveRoomSocket } from '../core/live-match-room-transport.js?v=5';
import { unpackLetter } from '../core/message-match-turn-letter-codec.js';

export function startLiveRoomGameSync({ api, id, matchId = null, mySide, letters, hud, onEnded,
  socketFactory = connectLiveRoomSocket, readTurn = readLiveRoomTurn }) {
  let seen = 0;
  let replaying = Promise.resolve();
  const receive = async (packed) => {
    if (!packed || packed.k <= seen) return;
    const letter = unpackLetter(packed);
    if (!letter || letter.levelId !== letters.levelId) return;
    if (packed.by === (mySide === 'home' ? 'h' : 'a')) letters.adopt(letter.rulesAfter, letter.flicks.at(-1).after);
    else {
      hud.event('OPPONENT FLICKED', { priority: 4, duration: 1.6, detail: `${letter.names[letter.by]} · Your move` });
      await letters.replay(letter);
    }
    seen = letter.seq;
    if (letter.rulesAfter.phase === 'ended') onEnded?.();
  };
  const queue = (packed) => { replaying = replaying.then(() => receive(packed)).catch(() => {}); };
  const catchUp = async () => {
    try { queue((await readTurn(api, id, undefined, matchId)).letter); }
    catch { /* no move yet, or the connection will retry */ }
  };
  const socket = socketFactory(api, id, (message) => {
    if (message.type === 'turn' && (message.matchId ?? null) === matchId) queue(message.letter);
  }, (connected) => { if (connected) void catchUp(); });
  void catchUp();
  const timer = setInterval(() => { if (!socket?.connected) void catchUp(); }, 1200);
  return {
    noteSent(letter) { seen = letter.seq; },
    close() { clearInterval(timer); socket?.close(); },
  };
}
