// Message Match app flow: start one from a 2-Player table, open a friend's move (short match link or
// self-contained letter link), replay it, play your flick, and send the table back. The match server
// is the transport when it is reachable; a letter link is the fallback, so a match never gets stuck.
import { MessageMatchLetters } from '../gameplay/message-match-letter-recorder-and-replayer.js?v=2';
import { encodeLetterLink, packLetter, unpackLetter } from '../core/message-match-turn-letter-codec.js';
import {
  MatchSeats, MatchServerError, fetchLatestLetter, matchApiBase, openServerMatch, sendServerTurn, shortMatchLink,
} from '../core/message-match-server-transport.js';
import { pushAvailability, subscribeToMatch } from '../core/message-match-push-subscription.js';
import { cleanPlayerNames } from '../core/hot-seat-series-and-rivalry-record.js';
import { CAMPAIGN_LEVELS } from '../levels/campaign-level-definitions.js';
import { MessageMatchLetterCard } from './message-match-letter-card.js?v=2';

const other = (side) => (side === 'home' ? 'away' : 'home');

/**
 * @param deps { app, openMatchTable(level, sessionOptions, versus), menus, hud, sound, cameraDirector, showResults, showTitle, baseUrl }
 */
export function createMessageMatchFlow(deps) {
  const { app, menus, hud, sound, cameraDirector } = deps;
  const card = new MessageMatchLetterCard();
  const seats = new MatchSeats();
  const api = matchApiBase();
  let matchId = null;    // the server's record of this match, when there is one
  let incoming = null;   // a friend's letter waiting to be watched
  let outgoing = null;   // our finished move, waiting to be sent
  let sentUrl = null;    // once a move is on the server, resending shares the same link
  let result = null;     // full time, held back until our last letter is sent

  const levelIndexOf = (levelId) => CAMPAIGN_LEVELS.findIndex((level) => level.id === levelId);
  const levelOf = (letter) => CAMPAIGN_LEVELS[levelIndexOf(letter.levelId)];

  function openTable(index, mySide, names, seq) {
    const level = CAMPAIGN_LEVELS[index];
    Object.assign(app, { mode: 'versus', levelIndex: index });
    result = null;
    outgoing = null;
    sentUrl = null;
    deps.openMatchTable(level, {
      controllers: { [mySide]: 'human', [other(mySide)]: 'remote' },
      playerNames: names,
      onEnd: (fullTime) => { result = fullTime; if (outgoing) card.showFullTimeButton(); else deps.showResults(fullTime); },
    }, true);
    hud.setNames(names.home, names.away);
    cameraDirector.setMode('play');
    menus.show(null);
    hud.show(true);
    return new MessageMatchLetters(app.session, { mySide, levelId: level.id, names, seq, onLetter: (letter) => {
      outgoing = letter;
      app.session.schedule(0.7, () => {
        card.showSend({ letter, level });
        menus.show('letter');
      });
    } });
  }

  /** Puts our move on the server and returns its short link, or null to fall back to a letter link. */
  async function upload(packed) {
    if (!api) return null;
    try {
      if (!matchId && packed.k === 1) matchId = (await openServerMatch(api, packed)).id;
      else if (matchId) await sendServerTurn(api, matchId, packed);
      else return null; // a match that began on letter links stays on letter links
      seats.remember(matchId, outgoing.by);
      return shortMatchLink(deps.baseUrl, matchId);
    } catch (error) {
      if (error instanceof MatchServerError && error.status === 409) throw error; // the match moved on: never fork it
      return null;
    }
  }

  /** After our move is on the server (or while waiting): offer "notify me when they flick". */
  let notifyFor = null;
  async function offerNotifications(side, opponent) {
    notifyFor = matchId && api ? { side, opponent } : null;
    if (!notifyFor) return card.showNotify(null);
    const state = pushAvailability();
    if (state !== 'granted') return card.showNotify(state === 'ready' || state === 'install' ? state : null, opponent);
    const ok = await subscribeToMatch({ api, matchId, side }).catch(() => false); // already allowed: no prompt needed
    card.showNotify(ok ? 'on' : 'failed', opponent);
  }

  function showIncoming(letter) {
    incoming = letter;
    card.showIncoming({ letter, level: levelOf(letter) });
    menus.show('letter');
  }

  return {
    /** From the 2-Player intro: this device plays home and flicks first. */
    start(index) {
      matchId = null;
      const names = cleanPlayerNames(menus.readPlayerNames());
      openTable(index, 'home', names, 0);
      sound.whistle();
      app.session.start('home');
    },

    /** A self-contained letter link arrived: say who flicked before anything moves. */
    open(letter) {
      if (levelIndexOf(letter.levelId) < 0) return false;
      matchId = null;
      showIncoming(letter);
      return true;
    },

    /** A short match link arrived: load the latest move from the server. */
    async openMatch(id) {
      matchId = id;
      card.showLoading();
      menus.show('letter');
      try {
        const { letter: packed } = await fetchLatestLetter(api, id);
        const letter = unpackLetter(packed);
        if (!letter || levelIndexOf(letter.levelId) < 0) throw new Error('unusable letter');
        if (seats.sideIn(id) === letter.by && letter.rulesAfter.phase !== 'ended') {
          card.showWaiting({ letter, level: levelOf(letter) });
          offerNotifications(letter.by, letter.names[other(letter.by)]);
        } else {
          showIncoming(letter);
        }
      } catch (error) {
        card.showUnavailable(error instanceof MatchServerError && error.status === 404
          ? 'This match has expired or never existed.' : 'Could not reach the match. Check your connection and try again.');
      }
    },

    refresh() {
      if (matchId) this.openMatch(matchId);
    },

    async watch() {
      const letter = incoming;
      if (!letter) return;
      incoming = null;
      if (matchId) seats.remember(matchId, other(letter.by));
      const letters = openTable(levelIndexOf(letter.levelId), other(letter.by), letter.names, letter.seq);
      if (letter.taunt) hud.event(`“${letter.taunt}”`, { priority: 3, duration: 2.4, detail: letter.names[letter.by] });
      try {
        await letters.replay(letter);
      } catch {
        deps.showTitle(); // a letter that does not fit its table: nothing sensible to show
      }
    },

    async send() {
      if (!outgoing) return;
      card.setBusy(true);
      try {
        const letter = { ...outgoing, taunt: card.readTaunt() };
        const url = sentUrl ?? await upload(packLetter(letter)) ?? encodeLetterLink(letter, deps.baseUrl);
        if (url.includes('/m/')) sentUrl = url; // a short match link: resending reuses it
        card.prepare(letter, url);
        await card.share.share();
        if (sentUrl && letter.rulesAfter.phase !== 'ended') offerNotifications(letter.by, letter.names[other(letter.by)]);
      } catch (error) {
        if (error instanceof MatchServerError) card.showConflict(error.message);
      } finally {
        card.setBusy(false);
      }
      if (result) card.showFullTimeButton();
    },

    async copy() {
      if (!outgoing) return;
      const letter = { ...outgoing, taunt: card.readTaunt() };
      try {
        const url = sentUrl ?? await upload(packLetter(letter)) ?? encodeLetterLink(letter, deps.baseUrl);
        if (url.includes('/m/')) sentUrl = url; // a short match link: resending reuses it
        card.prepare(letter, url);
        await card.share.copy();
        if (sentUrl && letter.rulesAfter.phase !== 'ended') offerNotifications(letter.by, letter.names[other(letter.by)]);
      } catch (error) {
        if (error instanceof MatchServerError) card.showConflict(error.message);
      }
    },

    /** From the "Notify me" tap: the permission prompt needs this gesture. */
    async notify() {
      if (!notifyFor) return;
      const ok = await subscribeToMatch({ api, matchId, side: notifyFor.side }).catch(() => false);
      card.showNotify(ok ? 'on' : (pushAvailability() === 'denied' ? null : 'failed'), notifyFor.opponent);
    },

    fullTime() {
      if (result) deps.showResults(result);
    },

    home() {
      incoming = null;
      outgoing = null;
      deps.showTitle();
    },
  };
}
