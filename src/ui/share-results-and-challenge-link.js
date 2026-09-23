// Share from the full-time card: the message, the "beat me" link and the PNG
// card. Everything is built while the results are on screen, so a tap on
// Share hands it straight to the phone's share sheet — Safari only opens the
// sheet while the tap's user activation is still fresh.
import { SIDE_HOME } from '../core/pitch-dimensions-and-constants.js';
import { encodeChallenge, markText } from '../core/challenge-link-codec-and-comparison.js';
import { drawResultsShareCard, loadShareCardFonts } from './results-share-card-canvas.js';
import { RESULTS_COPY } from './konk-interface-copy.js';

const venueOf = (level) => (level.legend ? `${level.name}, Act ${level.legend.act}` : level.name);

/**
 * Message, link and card contents for one finished match.
 * @param ctx { baseUrl, title, homeColour, names?: {home, away}, versusNotes?: string[], challengeNote?: string }
 */
export function buildResultShare(result, level, mode, ctx) {
  const { scores, winner } = result;
  const venue = venueOf(level);
  const card = {
    kicker: 'KONK! · FULL TIME', title: ctx.title, scores,
    homeColour: ctx.homeColour, awayColour: level.opponent.team.hudColor,
    place: level.place, stars: null, notes: [], footer: '',
  };
  if (mode === 'versus') {
    const { home, away } = ctx.names;
    const line = winner === null ? `${home} and ${away} couldn't split the table ${scores.home}–${scores.away}`
      : winner === SIDE_HOME ? `${home} took the table from ${away} ${scores.home}–${scores.away}`
        : `${away} took the table from ${home} ${scores.away}–${scores.home}`;
    const notes = ctx.versusNotes ?? [];
    return {
      url: ctx.baseUrl,
      text: `${line} at ${venue}. KONK!${notes.length ? ` ${notes.join('. ')}.` : ''}`,
      card: { ...card, matchup: `${home} vs ${away} · ${venue}`, notes, footer: RESULTS_COPY.shareLocalFooter },
    };
  }
  const kid = level.opponent.kid;
  const mark = { scores, flicks: result.flicksUsed[SIDE_HOME] };
  const url = `${ctx.baseUrl}${encodeChallenge({ levelId: level.id, mode, ...mark })}`;
  const flicks = `${mark.flicks} flick${mark.flicks === 1 ? '' : 's'}`;
  const brag = winner === SIDE_HOME ? `${kid} gave me a game at ${venue}. I won ${scores.home}–${scores.away} in ${flicks}. Your turn:`
    : `I ${markText(mark)} against ${kid} at ${venue} in KONK! Can you do better?`;
  return {
    url,
    text: brag,
    card: { ...card, matchup: `You vs ${kid} · ${venue}`, stars: result.starFlags,
      notes: ctx.challengeNote ? [ctx.challengeNote] : [], footer: RESULTS_COPY.shareSoloFooter },
  };
}

export class ResultsShare {
  /** @param statusEl element whose text reports what happened ("Link copied", …) */
  constructor(statusEl) {
    this.status = statusEl;
    this.pending = null;
  }

  /** Called when results appear; renders the card in the background. */
  prepare(share) {
    const pending = (this.pending = { ...share, file: null });
    this.status.textContent = '';
    loadShareCardFonts().then(() => new Promise((resolve) => {
      drawResultsShareCard(document.createElement('canvas'), share.card).toBlob(resolve, 'image/png');
    })).then((blob) => {
      if (blob && this.pending === pending) pending.file = new File([blob], 'konk-result.png', { type: 'image/png' });
    }).catch(() => { /* no card: the link and message still share */ });
  }

  async share() {
    const pending = this.pending;
    if (!pending) return;
    const message = `${pending.text} ${pending.url}`;
    try {
      if (pending.file && navigator.canShare?.({ files: [pending.file] })) {
        await navigator.share({ files: [pending.file], text: message });
        this.report('Shared.');
      } else if (navigator.share) {
        await navigator.share({ text: pending.text, url: pending.url });
        this.report('Shared.');
      } else await this.saveAndCopy(pending, message);
    } catch (error) {
      if (error?.name === 'AbortError') return; // the player closed the share sheet
      await this.saveAndCopy(pending, message);
    }
  }

  /** Desktop fallback: download the card and put the message on the clipboard. */
  async saveAndCopy(pending, message) {
    if (pending.file) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pending.file);
      link.download = pending.file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }
    let copied = false;
    try { await navigator.clipboard.writeText(message); copied = true; } catch { /* clipboard blocked */ }
    this.report(copied ? (pending.file ? 'Card saved. Message and link copied.' : 'Message and link copied.')
      : pending.file ? `Card saved. Send this link: ${pending.url}` : `Send this link: ${pending.url}`);
  }

  report(text) { this.status.textContent = text; }
}
