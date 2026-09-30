import { readLiveRoomTurn, connectLiveRoomSocket } from '../core/live-match-room-transport.js?v=4';
import { unpackLetter } from '../core/message-match-turn-letter-codec.js';

export function startLiveRoomGameSync({ api, id, mySide, letters, hud, socketFactory = connectLiveRoomSocket,
  readTurn = readLiveRoomTurn }) {
  let seen = 0;
  let replaying = Promise.resolve();
  const receive = async (packed) => {
    if (!packed || packed.k <= seen || packed.by === (mySide === 'home' ? 'h' : 'a')) return;
    const letter = unpackLetter(packed);
    if (!letter || letter.levelId !== letters.levelId) return;
    hud.event('OPPONENT FLICKED', { priority: 4, duration: 1.6, detail: `${letter.names[letter.by]} · Your move` });
    await letters.replay(letter);
    seen = letter.seq;
  };
  const queue = (packed) => { replaying = replaying.then(() => receive(packed)).catch(() => {}); };
  const catchUp = async () => {
    try { queue((await readTurn(api, id)).letter); }
    catch { /* no move yet, or the connection will retry */ }
  };
  const socket = socketFactory(api, id, (message) => {
    if (message.type === 'turn') queue(message.letter);
  }, (connected) => { if (connected) void catchUp(); });
  void catchUp();
  const timer = setInterval(() => { if (!socket?.connected) void catchUp(); }, 1200);
  return {
    noteSent(letter) { seen = letter.seq; },
    close() { clearInterval(timer); socket?.close(); },
  };
}
