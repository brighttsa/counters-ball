// Which list of tables each mode plays on, which of them can be entered, and
// turning a friend's "beat me" link into a table on that list.
import { CAMPAIGN_LEVELS } from './campaign-level-definitions.js';
import { STREET_LEGENDS_ACTS, isLegendActUnlocked } from './street-legends-acts-and-unlocks.js';
import { isLevelUnlocked } from '../core/save-progress-local-storage.js';
import { decodeChallenge, stripChallengeParams } from '../core/challenge-link-codec-and-comparison.js';

/** Street Legends has its own 18 acts; the Classic Campaign and the 2-Player Table share the six venues. */
export const trackFor = (mode) => (mode === 'legends' ? STREET_LEGENDS_ACTS : CAMPAIGN_LEVELS);

/** A challenge applies only to the table it names. */
export const challengeForLevel = (challenge, level) => (challenge && level && challenge.levelId === level.id ? challenge : null);

/** Every 2-Player table is open, and so is the table a friend's link names; the rest unlock by winning. */
export function isTrackLevelUnlocked(progress, mode, index, challenge = null) {
  if (mode === 'versus' || challengeForLevel(challenge, trackFor(mode)[index])) return true;
  return mode === 'legends' ? isLegendActUnlocked(progress, STREET_LEGENDS_ACTS, index)
    : isLevelUnlocked(progress, CAMPAIGN_LEVELS, index);
}

/**
 * Reads a challenge from the page URL and strips it, so a reload lands on the title
 * rather than the challenge again. Returns the challenge plus its table's index, or null.
 */
export function takeChallengeFromUrl(loc = location, hist = history) {
  if (!loc.search) return null;
  const challenge = decodeChallenge(loc.search);
  hist.replaceState(null, '', stripChallengeParams(loc.href));
  const index = challenge ? trackFor(challenge.mode).findIndex((level) => level.id === challenge.levelId) : -1;
  return index < 0 ? null : { ...challenge, index };
}
