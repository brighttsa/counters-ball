import { readLiveRoomTurn, connectLiveRoomSocket } from '../core/live-match-room-transport.js?v=4';
import { unpackLetter } from '../core/message-match-turn-letter-codec.js';

export function startLiveRoomGameSync({ api, id, mySide, letters, hud, socketFactory = connectLiveRoomSocket }) {
  let seen = 0;
  const receive = async (packed) => {
    if (!packed || packed.k <= seen || packed.by === (mySide === 'home' ? 'h' : 'a')) return;
    const letter = unpackLetter(packed);
    if (!letter) return;
    seen = letter.seq;
    hud.event('OPPONENT FLICKED', { priority: 4, duration: 1.6, detail: `${letter.names[letter.by]} · Your move` });
    await letters.replay(letter);
  };
  const socket = socketFactory(api, id, (message) => {
    if (message.type === 'turn') void receive(message.letter);
  });
  const timer = setInterval(async () => {
    if (socket?.connected) return;
    try { await receive((await readLiveRoomTurn(api, id)).letter); }
    catch { /* reconnecting WebSocket or HTTP fallback will retry */ }
  }, 1200);
  return {
    noteSent(letter) { seen = letter.seq; },
    close() { clearInterval(timer); socket?.close(); },
  };
}
