// The Message Match card: "they flicked, watch it" on the way in, "send your move" on the way out.
import { FriendMatchInviteShare } from './friend-match-invite-share.js';
import { cleanTaunt } from '../core/message-match-turn-letter-codec.js';

const $ = (id) => document.getElementById(id);
const scoreLine = (names, scores) => `${names.home} ${scores.home}–${scores.away} ${names.away}`;

export class MessageMatchLetterCard {
  constructor() {
    this.share = new FriendMatchInviteShare($('letter-status'),
      { shared: 'Sent. Their move comes back as a link.', copied: 'Link copied. Paste it in your chat.' });
  }

  group(name) {
    for (const el of document.querySelectorAll('[data-letter-group]')) el.hidden = el.dataset.letterGroup !== name;
  }

  fill({ title, level, line, taunt = '' }) {
    $('letter-title').textContent = title;
    $('letter-venue').textContent = `${level.name} · ${level.place}`;
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

  showSend({ letter, level, url }) {
    const to = letter.names[letter.by === 'home' ? 'away' : 'home'];
    const ended = letter.rulesAfter.phase === 'ended';
    this.fill({ title: ended ? 'That is full time' : 'Your flick is in', level,
      line: `${scoreLine(letter.names, letter.rulesAfter.scores)}. ${ended ? `Send it so ${to} sees it land.` : `Send it to ${to}: they watch it, then flick back.`}` });
    $('letter-taunt-input').value = '';
    $('letter-full-time').hidden = true;
    this.group('send');
    this.prepare(letter, url);
  }

  prepare(letter, url) {
    const me = letter.names[letter.by];
    const taunt = this.readTaunt();
    this.share.prepare({ url: url(taunt), text: taunt ? `${me}: “${taunt}” Your move in KONK!` : `${me} just flicked. Your move in KONK!` });
  }

  readTaunt() {
    return cleanTaunt($('letter-taunt-input').value);
  }

  showFullTimeButton() {
    $('letter-full-time').hidden = false;
  }
}
