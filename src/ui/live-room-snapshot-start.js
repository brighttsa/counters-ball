import { readLiveRoomTurn } from '../core/live-match-room-transport.js?v=6';
import { unpackLetter } from '../core/message-match-turn-letter-codec.js';
import { startLiveMatchRoomSession } from './live-match-room-session.js';
export async function startLiveRoomFromSnapshot({ api, index, id, mySide, names, matchId, onRoundEnd, openTable, hud, sound, app, menus }) {
  let restored = null;
  try {
    restored = unpackLetter((await readLiveRoomTurn(api, id, undefined, matchId)).letter);
    if (!restored || restored.levelId !== index.id) throw Error('Invalid match snapshot');
  } catch (error) {
    if (error.status !== 404) {
      menus.show('live-room'); hud.show(false);
      document.getElementById('live-room-status').textContent = 'Could not restore the match. Reopen your invite to retry.';
      return null;
    }
  }
  const letters = openTable(index, mySide, names, restored?.seq ?? 0, true, onRoundEnd);
  if (restored && restored.flicks.at(-1).after.length !== (app.session.entries.length + 1) * 2) {
    menus.show('live-room'); hud.show(false);
    document.getElementById('live-room-status').textContent = 'Match snapshot does not fit this table. Ask for a fresh invite.';
    return null;
  }
  hud.event(restored ? 'MATCH RESTORED' : 'LIVE MATCH', { priority: 6, duration: 2.2, detail: mySide === 'home' ? 'You are HOME' : 'You are AWAY' });
  sound.whistle(); app.session.start('home');
  if (restored) letters.adopt(restored.rulesAfter, restored.flicks.at(-1).after);
  return startLiveMatchRoomSession({ api, id, matchId, mySide, names, letters, hud, onRoundEnd });
}
