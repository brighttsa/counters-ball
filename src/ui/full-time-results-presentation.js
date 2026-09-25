// Full time, end to end: record stars (against the AI) or the series and
// head-to-head (2-Player), work out the extra lines, prepare the share, and
// fill the results card. The caller only hides the HUD and shows the screen.
import { recordLevelStars } from '../core/save-progress-local-storage.js';
import { challengeVerdictLine } from '../core/challenge-link-codec-and-comparison.js';
import { buildResultShare } from './share-results-and-challenge-link.js';
import { fullTimeTitle } from './ui-full-time-results-card.js?v=2';

/**
 * @param ctx { level, mode, levelIndex, trackLength, progress, hotSeat, challenge, card, share, homeColour, baseUrl, onStar }
 */
export function presentFullTimeResults(result, ctx) {
  const { level, mode, levelIndex, trackLength, progress, hotSeat, challenge, homeColour } = ctx;
  const campaign = mode !== 'versus';
  const improved = campaign && recordLevelStars(progress, level.id, result.stars);
  const names = campaign ? null : { ...hotSeat.names };
  const lines = !campaign ? hotSeat.finish(result.winner) : challenge ? [challengeVerdictLine(result, challenge)] : [];
  ctx.share.prepare(buildResultShare(result, level, mode, {
    baseUrl: ctx.baseUrl, title: fullTimeTitle(result, level, mode, names),
    homeColour, names, versusNotes: lines, challengeNote: lines[0],
  }));
  ctx.card.fill(result, level, mode, {
    names, lines, rematchLabel: hotSeat.seriesDecided ? 'New series' : 'Rematch',
    hasNext: campaign && result.stars > 0 && levelIndex < trackLength - 1,
    isFinalVenue: levelIndex === trackLength - 1,
    improved,
    onStar: ctx.onStar,
    homeColour,
  });
}
