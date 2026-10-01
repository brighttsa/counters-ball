import { packLetter } from '../core/message-match-turn-letter-codec.js';
import { sendLiveRoomTurn } from '../core/live-match-room-transport.js?v=6';
import { createLiveMatchTurnOutbox } from '../core/live-match-turn-outbox.js';
import { startLiveRoomGameSync } from './live-match-room-game-sync.js?v=4';

export function startLiveMatchRoomSession({ api, id, matchId, mySide, names, letters, hud, onRoundEnd }) {
  let finished = false;
  const finish = () => {
    if (finished || !onRoundEnd) return;
    finished = true; connection.close(); onRoundEnd();
  };
  const sync = startLiveRoomGameSync({ api, id, matchId, mySide, letters, hud, onEnded: finish });
  const outbox = createLiveMatchTurnOutbox({
    send: (letter) => sendLiveRoomTurn(api, id, packLetter(letter), undefined, matchId),
    onSent(letter) {
      sync.noteSent(letter);
      hud.event('YOUR FLICK IS IN', { priority: 5, duration: 1.4, detail: `${names[mySide]} · waiting for the answer` });
      if (letter.rulesAfter.phase === 'ended') finish();
    },
    onRetry: () => hud.event('RECONNECTING', { priority: 6, duration: 2, detail: 'Your flick is saved. Sending it again.' }),
    onError: () => hud.event('MATCH CONNECTION ERROR', { priority: 6, duration: 4, detail: 'The server could not accept this turn.' }),
  });
  letters.onLetter = (letter) => outbox.send(letter);
  const connection = { close() { outbox.close(); sync.close(); } };
  return connection;
}
