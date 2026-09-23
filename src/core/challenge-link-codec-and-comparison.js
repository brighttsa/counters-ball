// "Beat me" links: one finished match against a neighbourhood kid, packed into
// the page's query string so a friend can open the same table and compare.
// Honour system on purpose: there is no server to check a result, and at
// friend scale a forged link only fools the forger's own friend.
import { SIDE_HOME } from './pitch-dimensions-and-constants.js';

const MODES = new Set(['campaign', 'legends']);
const LEVEL_ID = /^[a-z0-9-]{1,48}$/;
export const CHALLENGE_PARAMS = ['beat', 'm', 's', 'f'];

const outcomeOf = (home, away) => (home > away ? 'won' : home < away ? 'lost' : 'drew');

/** Query string (with leading '?') for a finished match. No name: the message it arrives in says who sent it. */
export function encodeChallenge({ levelId, mode, scores, flicks }) {
  return `?${new URLSearchParams({ beat: levelId, m: mode, s: `${scores.home}-${scores.away}`, f: String(flicks) })}`;
}

/** Reads a challenge from a query string; anything malformed or out of range gives null. */
export function decodeChallenge(search) {
  const params = new URLSearchParams(search);
  const levelId = params.get('beat');
  const mode = params.get('m');
  const score = /^(\d{1,2})-(\d{1,2})$/.exec(params.get('s') ?? '');
  const flicks = Number(params.get('f'));
  if (!levelId || !LEVEL_ID.test(levelId) || !MODES.has(mode) || !score) return null;
  if (!Number.isInteger(flicks) || flicks < 1 || flicks > 999) return null;
  return {
    levelId, mode,
    scores: { home: Number(score[1]), away: Number(score[2]) },
    flicks,
  };
}

/** The page URL with any challenge parameters removed, e.g. for replaceState after reading one. */
export function stripChallengeParams(href) {
  const url = new URL(href);
  for (const key of CHALLENGE_PARAMS) url.searchParams.delete(key);
  return url.toString();
}

// Win beats draw beats loss; then goal difference; then fewer flicks.
function markRank({ scores, flicks }) {
  const { home, away } = scores;
  return [home > away ? 2 : home === away ? 1 : 0, home - away, -flicks];
}

/** 'beat' | 'matched' | 'short' — how a finished result stands against a challenge's mark. */
export function compareToChallenge(result, challenge) {
  const mine = markRank({ scores: result.scores, flicks: result.flicksUsed[SIDE_HOME] });
  const theirs = markRank(challenge);
  for (let i = 0; i < mine.length; i++) {
    if (mine[i] !== theirs[i]) return mine[i] > theirs[i] ? 'beat' : 'short';
  }
  return 'matched';
}

/** "won 2–0 in 5 flicks" from the home side's point of view. */
export function markText({ scores, flicks }) {
  const { home, away } = scores;
  return `${outcomeOf(home, away)} ${home}–${away} in ${flicks} flick${flicks === 1 ? '' : 's'}`;
}

export function challengeInviteLine(challenge, level) {
  return `Your friend ${markText(challenge)} against ${level.opponent.kid}.`;
}

export function challengeVerdictLine(result, challenge) {
  const theirs = markText(challenge);
  const verdict = compareToChallenge(result, challenge);
  if (verdict === 'beat') return `You beat their mark (${theirs}).`;
  if (verdict === 'matched') return `Same mark. Different match: you both ${theirs}.`;
  return `Their mark stands: ${theirs}. Run it back.`;
}
