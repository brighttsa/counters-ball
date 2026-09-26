// Daily Flick app flow: open today's puzzle table straight into play, then show a small result card with
// the score against par, the streak and a share button. Retrying is allowed; the best score is what counts.
import { dailyFlickPuzzle, dailyNumber, DAILY_FLICK_LIMIT } from '../levels/daily-flick-puzzle.js';
import { recordDailyResult, dailyShareText } from '../core/daily-flick-record.js';
import { applyPracticeSetup } from '../gameplay/kwame-corner-practice-lesson-steps.js';

const $ = (id) => document.getElementById(id);

const headline = (flicks, par) => (flicks === null ? 'No goal' : flicks < par ? 'Under par!' : flicks === par ? 'On par' : `${flicks} flicks`);

/**
 * @param deps { app, progress, save, openMatchTable, menus, hud, sound, cameraDirector, baseUrl }
 */
export function createDailyFlickFlow({ app, progress, save, openMatchTable, menus, hud, sound, cameraDirector, baseUrl }) {
  let puzzle = null;
  let shareText = '';

  function start() {
    puzzle = dailyFlickPuzzle(dailyNumber());
    app.mode = 'daily';
    app.levelIndex = 0;
    openMatchTable(puzzle.level, { controllers: { home: 'human', away: 'ai' }, onEnd: finish }, false);
    cameraDirector.setMode('play');
    menus.show(null);
    hud.show(true);
    sound.whistle();
    app.session.start();
    applyPracticeSetup(app.session, puzzle.setup); // after kick-off, which puts every piece on its spot
    hud.event(`DAILY FLICK #${puzzle.number}`, { priority: 5, duration: 1.8, detail: `Score in ${DAILY_FLICK_LIMIT} flicks · par ${puzzle.par}` });
  }

  function finish(result) {
    const flicks = result.winner === 'home' ? result.flicksUsed.home : null;
    const record = recordDailyResult(progress, puzzle.number, flicks);
    save(progress);
    shareText = dailyShareText(puzzle.number, record.best, puzzle.par, record.streak, baseUrl);
    hud.show(false);
    $('daily-number').textContent = `Daily Flick #${puzzle.number}`;
    $('daily-headline').textContent = headline(flicks, puzzle.par);
    $('daily-score').textContent = `Par ${puzzle.par}${record.best !== null ? ` · your best today: ${record.best}` : ''}`;
    $('daily-streak').textContent = record.streak > 1 ? `${record.streak}-day streak. A new table tomorrow.` : 'A new table tomorrow.';
    $('daily-share-status').textContent = '';
    menus.show('daily-result');
  }

  async function share() {
    const status = $('daily-share-status');
    try {
      if (navigator.share) { await navigator.share({ text: shareText }); return; }
      await navigator.clipboard.writeText(shareText);
      status.textContent = 'Copied. Paste it in your chat.';
    } catch (error) {
      if (error?.name !== 'AbortError') status.textContent = 'Could not share. Try again.';
    }
  }

  /** Home screen button: today's number, and the best score once played. */
  function refreshHomeButton() {
    const number = dailyNumber();
    const best = progress.daily?.best?.[number];
    $('home-daily').textContent = best ? `Daily #${number} · ${best} ✓` : `Daily Flick #${number}`;
  }

  return { start, share, refreshHomeButton };
}
