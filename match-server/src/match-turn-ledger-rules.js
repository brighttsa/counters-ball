// Pure rules for a Message Match record: which letters may open a match and which may follow.
// A letter is accepted only if it continues exactly where the stored table and score left off,
// so replies can never fork a match, repeat a turn, or rewrite the score.
import { unpackLetter } from '../../src/core/message-match-turn-letter-codec.js';

export const MAX_LETTER_BYTES = 16 * 1024;

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const lastTable = (packed) => packed.f.at(-1)[3];

/** @returns {{ ok: true } | { ok: false, status: number, error: string }} */
export function checkOpeningLetter(packed) {
  const letter = unpackLetter(packed);
  if (!letter) return { ok: false, status: 400, error: 'letter is not valid' };
  if (letter.seq !== 1 || letter.by !== 'home') return { ok: false, status: 400, error: 'a match opens with home\'s first move' };
  const { scores, flicksUsed } = letter.rulesBefore;
  if (scores.home || scores.away || flicksUsed.home || flicksUsed.away) return { ok: false, status: 400, error: 'a match opens at kick-off' };
  return { ok: true };
}

/** @param previous the last stored packed letter; @param packed the proposed next one */
export function checkNextLetter(previous, packed) {
  const letter = unpackLetter(packed);
  if (!letter) return { ok: false, status: 400, error: 'letter is not valid' };
  if (previous.ra[0] === 1) return { ok: false, status: 409, error: 'this match is already over' };
  if (packed.k !== previous.k + 1) return { ok: false, status: 409, error: 'this match has moved on' };
  if (packed.l !== previous.l || !same(packed.n, previous.n)) return { ok: false, status: 400, error: 'letter belongs to a different match' };
  if (packed.by === previous.by) return { ok: false, status: 409, error: 'it is not this side\'s move' };
  if (!same(packed.rb, previous.ra) || !same(packed.b, lastTable(previous))) {
    return { ok: false, status: 409, error: 'letter does not continue from the last move' };
  }
  return { ok: true };
}

export function newMatchId(random = crypto.getRandomValues.bind(crypto)) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alikes (0/O, 1/l/I)
  return Array.from(random(new Uint8Array(10)), (b) => alphabet[b % alphabet.length]).join('');
}

export const MATCH_ID = /^[a-km-np-zA-HJ-NP-Z2-9]{10}$/;
