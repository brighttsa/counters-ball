// Message Match "letters": one player's move (every flick until the table passes to the other
// player) packed into a link. A letter carries the table before, each flick's velocity, the table
// after each flick, and the rules before/after, so the receiver replays it exactly and then snaps to
// the sender's settled result. Pure data: the transport (link today, a backend record later) is separate.
import { cleanPlayerName } from './hot-seat-series-and-rivalry-record.js';

export const LETTER_PARAM = 'km';
export const LETTER_VERSION = 1;
const POS_SCALE = 1e4;  // table units → int, 0.1 mm
const VEL_SCALE = 1e3;
const MAX_ABS = 60000;  // well outside any table; rejects garbage early
const MAX_FLICKS = 8;
const MAX_TAUNT = 40;
const LEVEL_ID = /^[a-z0-9-]{1,48}$/;
const SIDES = { home: 'h', away: 'a' };
const SIDE_OF = { h: 'home', a: 'away' };
const PHASES = ['aiming', 'ended'];
const TIEBREAKS = [null, 'golden', 'extra'];

const toInts = (values, scale) => values.map((v) => Math.round(v * scale));
const fromInts = (values, scale) => values.map((v) => v / scale);
const isIntList = (list, length) => Array.isArray(list) && (length == null || list.length === length)
  && list.every((n) => Number.isInteger(n) && Math.abs(n) <= MAX_ABS);
const isCount = (n) => Number.isInteger(n) && n >= 0 && n <= 99;
const pair = (obj) => [obj.home, obj.away];
const unpair = ([home, away]) => ({ home, away });

export function cleanTaunt(raw) {
  return String(raw ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_TAUNT);
}

function packRules(snap) {
  return [PHASES.indexOf(snap.phase), SIDES[snap.turn], pair(snap.scores), pair(snap.flicksUsed),
    snap.lastScorer ? SIDES[snap.lastScorer] : 0, TIEBREAKS.indexOf(snap.tiebreak), pair(snap.tiebreakBonus)];
}

function unpackRules(r) {
  if (!Array.isArray(r) || r.length !== 7) return null;
  const [phase, turn, scores, flicks, last, tiebreak, bonus] = r;
  if (!PHASES[phase] || !SIDE_OF[turn] || !(last === 0 || SIDE_OF[last]) || TIEBREAKS[tiebreak] === undefined) return null;
  if (![scores, flicks, bonus].every((p) => Array.isArray(p) && p.length === 2 && p.every(isCount))) return null;
  return { phase: PHASES[phase], turn: SIDE_OF[turn], scores: unpair(scores), flicksUsed: unpair(flicks),
    lastScorer: last ? SIDE_OF[last] : null, tiebreak: TIEBREAKS[tiebreak], tiebreakBonus: unpair(bonus) };
}

/**
 * @param letter { levelId, names:{home,away}, seq, by:'home'|'away', before:number[], rulesBefore, flicks:[{entry, vx, vy, after:number[]}], rulesAfter, taunt? }
 * @returns {object} compact, JSON-safe form (callers pick the transport: link now, backend later)
 */
export function packLetter(letter) {
  return {
    v: LETTER_VERSION, l: letter.levelId, n: pair(letter.names), k: letter.seq, by: SIDES[letter.by],
    b: toInts(letter.before, POS_SCALE), rb: packRules(letter.rulesBefore), ra: packRules(letter.rulesAfter),
    f: letter.flicks.map((f) => [f.entry, ...toInts([f.vx, f.vy], VEL_SCALE), toInts(f.after, POS_SCALE)]),
    ...(letter.taunt ? { m: cleanTaunt(letter.taunt) } : {}),
  };
}

/** Validates everything: a letter arrives from a link anyone could have edited. Returns null if unusable. */
export function unpackLetter(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== LETTER_VERSION) return null;
  if (typeof raw.l !== 'string' || !LEVEL_ID.test(raw.l) || !SIDE_OF[raw.by] || !isCount(raw.k)) return null;
  if (!Array.isArray(raw.n) || raw.n.length !== 2 || !isIntList(raw.b) || raw.b.length < 4 || raw.b.length % 2) return null;
  const bodies = raw.b.length;
  if (!Array.isArray(raw.f) || raw.f.length < 1 || raw.f.length > MAX_FLICKS) return null;
  const flicks = [];
  for (const f of raw.f) {
    if (!Array.isArray(f) || f.length !== 4 || !Number.isInteger(f[0]) || f[0] < 0 || f[0] >= bodies / 2 - 1) return null;
    if (!isIntList([f[1], f[2]]) || !isIntList(f[3], bodies)) return null;
    flicks.push({ entry: f[0], vx: f[1] / VEL_SCALE, vy: f[2] / VEL_SCALE, after: fromInts(f[3], POS_SCALE) });
  }
  const rulesBefore = unpackRules(raw.rb);
  const rulesAfter = unpackRules(raw.ra);
  if (!rulesBefore || !rulesAfter || rulesBefore.phase !== 'aiming' || rulesBefore.turn !== SIDE_OF[raw.by]) return null;
  return {
    levelId: raw.l, seq: raw.k, by: SIDE_OF[raw.by],
    names: { home: cleanPlayerName(raw.n[0], 'Player 1'), away: cleanPlayerName(raw.n[1], 'Player 2') },
    before: fromInts(raw.b, POS_SCALE), rulesBefore, flicks, rulesAfter, taunt: cleanTaunt(raw.m),
  };
}

const toBase64Url = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (text) => new TextDecoder().decode(
  Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

export function encodeLetterLink(letter, baseUrl) {
  return `${baseUrl}?${LETTER_PARAM}=${toBase64Url(JSON.stringify(packLetter(letter)))}`;
}

export function decodeLetterSearch(search) {
  const value = new URLSearchParams(search).get(LETTER_PARAM);
  if (!value || value.length > 8000) return null;
  try { return unpackLetter(JSON.parse(fromBase64Url(value))); } catch { return null; }
}

/** Reads a letter from the page URL and strips it, so a reload lands on the title rather than replaying. */
export function takeLetterFromUrl(loc = location, hist = history) {
  const letter = decodeLetterSearch(loc.search);
  if (!new URLSearchParams(loc.search).has(LETTER_PARAM)) return null;
  const url = new URL(loc.href);
  url.searchParams.delete(LETTER_PARAM);
  hist.replaceState(null, '', url.toString());
  return letter;
}
