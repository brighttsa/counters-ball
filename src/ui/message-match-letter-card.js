// The Message Match card: "they flicked, watch it" on the way in, "send your move" on the way out,
// plus the short-link states: loading the match, waiting on your friend, and a match that is gone.
import { FriendMatchInviteShare } from './friend-match-invite-share.js';
import { cleanTaunt } from '../core/message-match-turn-letter-codec.js';

const $ = (id) => document.getElementById(id);
const scoreLine = (names, scores) => `${names.home} ${scores.home}–${scores.away} ${names.away}`;
const opponentOf = (letter) => letter.names[letter.by === 'home' ? 'away' : 'home'];

export class MessageMatchLetterCard {
  constructor() {
    this.share = new FriendMatchInviteShare($('letter-status'),
      { shared: 'Sent. Their move comes back as a link.', copied: 'Link copied. Paste it in your chat.' });
  }

  group(name) {
    $('letter-notify').hidden = true; // offered again by the flow once a match is on the server
    for (const el of document.querySelectorAll('[data-letter-group]')) el.hidden = el.dataset.letterGroup !== name;
  }

  fill({ title, level = null, line, taunt = '' }) {
    $('letter-title').textContent = title;
    $('letter-venue').textContent = level ? `${level.name} · ${level.place}` : '';
    $('letter-line').textContent = line;
    $('letter-taunt').textContent = taunt ? `“${taunt}”` : '';
    $('letter-taunt').hidden = !taunt;
  }

  showIncoming({ letter, level }) {
    const from = letter.names[letter.by];
    const ended = letter.rulesAfter.phase === 'ended';
    this.fill({ title: ended ? `${from} took the last flick` : `${from} flicked`, level, taunt: letter.taunt,
      line: `${scoreLine(letter.names, letter.rulesBefore.scores)}. ${ended ? 'Watch how it ended.' : 'Watch their flick, then it is yours.'}` });
    this.group('incoming');
  }

  showSend({ letter, level }) {
    const ended = letter.rulesAfter.phase === 'ended';
    const to = opponentOf(letter);
    this.fill({ title: ended ? 'That is full time' : 'Your flick is in', level,
      line: `${scoreLine(letter.names, letter.rulesAfter.scores)}. ${ended ? `Send it so ${to} sees it land.` : `Send it to ${to}: they watch it, then flick back.`}` });
    $('letter-taunt-input').value = '';
    $('letter-full-time').hidden = true;
    this.share.report('');
    this.group('send');
  }

  showLoading() {
    this.fill({ title: 'Opening the match…', line: 'Fetching the latest flick.' });
    this.group('message');
  }

  showWaiting({ letter, level }) {
    this.fill({ title: `Waiting for ${opponentOf(letter)}`, level,
      line: `${scoreLine(letter.names, letter.rulesAfter.scores)}. Your flick is with them. This same link opens their reply when it lands.` });
    this.group('waiting');
  }

  showUnavailable(line) {
    this.fill({ title: 'Match not found', line });
    this.group('message');
  }

  showConflict(reason) {
    this.share.report(`Not sent: ${reason}. Open the match link again to see the latest flick.`);
  }

  setBusy(busy) {
    for (const el of document.querySelectorAll('[data-action="letter-send"], [data-action="letter-copy"]')) el.disabled = busy;
  }

  /** @param url the link to share: a short match link, or a self-contained letter link */
  prepare(letter, url) {
    const me = letter.names[letter.by];
    const taunt = cleanTaunt(letter.taunt);
    this.share.prepare({ url, text: taunt ? `${me}: “${taunt}” Your move in KONK!` : `${me} just flicked. Your move in KONK!` });
  }

  readTaunt() {
    return cleanTaunt($('letter-taunt-input').value);
  }

  /** @param state from pushAvailability, or 'on' once subscribed; null hides the row */
  showNotify(state, opponent) {
    const row = $('letter-notify');
    const button = $('letter-notify-button');
    const copy = {
      ready: ['', `Notify me when ${opponent} flicks`],
      on: [`Notifications on: you will hear when ${opponent} flicks.`, null],
      install: ['On iPhone, tap Share → Add to Home Screen, then open KONK! from there to get notified.', null],
      failed: ['Could not turn on notifications. Your link still works.', `Try notifications again`],
    }[state];
    row.hidden = !copy;
    if (!copy) return;
    $('letter-notify-status').textContent = copy[0];
    button.hidden = !copy[1];
    if (copy[1]) button.textContent = copy[1];
  }

  showFullTimeButton() {
    $('letter-full-time').hidden = false;
  }
}
