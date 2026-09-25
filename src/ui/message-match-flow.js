// Message Match app flow: start one from a 2-Player table, open a friend's letter from a link,
// replay it, play your flick, and send the table back. Links are the transport for now.
import { MessageMatchLetters } from '../gameplay/message-match-letter-recorder-and-replayer.js';
import { encodeLetterLink } from '../core/message-match-turn-letter-codec.js';
import { cleanPlayerNames } from '../core/hot-seat-series-and-rivalry-record.js';
import { CAMPAIGN_LEVELS } from '../levels/campaign-level-definitions.js';
import { MessageMatchLetterCard } from './message-match-letter-card.js';

const other = (side) => (side === 'home' ? 'away' : 'home');

/**
 * @param deps { app, openMatchTable(level, sessionOptions, versus), menus, hud, sound, cameraDirector, showResults, showTitle, baseUrl }
 */
export function createMessageMatchFlow(deps) {
  const { app, menus, hud, sound, cameraDirector } = deps;
  const card = new MessageMatchLetterCard();
  let incoming = null;   // a friend's letter waiting to be watched
  let outgoing = null;   // our finished move, waiting to be sent
  let result = null;     // full time, held back until our last letter is sent

  const levelIndexOf = (levelId) => CAMPAIGN_LEVELS.findIndex((level) => level.id === levelId);

  function openTable(index, mySide, names, seq) {
    const level = CAMPAIGN_LEVELS[index];
    Object.assign(app, { mode: 'versus', levelIndex: index });
    result = null;
    outgoing = null;
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
        card.showSend({ letter, level, url: (taunt) => encodeLetterLink({ ...letter, taunt }, deps.baseUrl) });
        menus.show('letter');
      });
    } });
  }

  return {
    /** From the 2-Player intro: this device plays home and flicks first. */
    start(index) {
      const names = cleanPlayerNames(menus.readPlayerNames());
      openTable(index, 'home', names, 0);
      sound.whistle();
      app.session.start('home');
    },

    /** A letter arrived in the URL: say who flicked before anything moves. */
    open(letter) {
      const index = levelIndexOf(letter.levelId);
      if (index < 0) return false;
      incoming = letter;
      card.showIncoming({ letter, level: CAMPAIGN_LEVELS[index] });
      menus.show('letter');
      return true;
    },

    async watch() {
      const letter = incoming;
      if (!letter) return;
      incoming = null;
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
      card.prepare(outgoing, (taunt) => encodeLetterLink({ ...outgoing, taunt }, deps.baseUrl));
      await card.share.share();
      if (result) card.showFullTimeButton();
    },

    async copy() {
      if (!outgoing) return;
      card.prepare(outgoing, (taunt) => encodeLetterLink({ ...outgoing, taunt }, deps.baseUrl));
      await card.share.copy();
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
