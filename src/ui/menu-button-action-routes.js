// Every [data-action] button in index.html, mapped to what it does. The app
// flow (title, levels, intro, match, results) lives in main.js; this is only
// the routing table plus the two saved preference toggles.

/**
 * @param ctx { app, progress, save, flow, hud, sound, cameraDirector, hotSeat, resultsShare, menus }
 *   flow: { showTitle, showLevels, previewLevel, prepareMatch, kickOff, setPaused, featuredIndex }
 */
export function createMenuActions({ app, progress, save, flow, hud, sound, cameraDirector, hotSeat, resultsShare, menus }) {
  const finishReplay = () => { if (app.session?.presentation.replay.active) app.session.presentation.finishReplay(); };
  return {
    'play-featured': () => { app.mode = 'legends'; flow.prepareMatch(flow.featuredIndex()); },
    'play-campaign': () => flow.showLevels('campaign'),
    'play-versus': () => flow.showLevels('versus'),
    'play-legends': () => flow.showLevels('legends'),
    'back-to-title': () => flow.showTitle(),
    'select-level': (el) => flow.prepareMatch(Number(el.dataset.index)),
    'preview-level': (el) => flow.previewLevel(Number(el.dataset.index)),
    'intro-back': () => flow.showLevels(),
    'kick-off': () => flow.kickOff(),
    'skip-replay': finishReplay,
    'toggle-camera-motion': (el) => {
      cameraDirector.setMotion(!cameraDirector.motionEnabled);
      el.setAttribute('aria-pressed', String(cameraDirector.motionEnabled));
      if (!cameraDirector.motionEnabled) finishReplay();
    },
    pause: () => flow.setPaused(true),
    resume: () => flow.setPaused(false),
    restart: () => flow.prepareMatch(app.levelIndex),
    quit: () => flow.showLevels(),
    'results-levels': () => flow.showLevels(),
    replay: () => { // on the 2-Player Table this is Rematch: next game of the series, straight to kick-off
      if (app.mode !== 'versus') return flow.prepareMatch(app.levelIndex);
      hotSeat.rematch();
      flow.prepareMatch(app.levelIndex, { rematch: true });
    },
    'share-result': () => resultsShare.share(),
    'challenge-accept': () => {
      app.mode = app.challenge.mode;
      app.levelIndex = app.challenge.index;
      flow.prepareMatch(app.challenge.index);
    },
    'challenge-decline': () => flow.showTitle(),
    'next-level': () => flow.prepareMatch(app.levelIndex + 1),
    'toggle-hud-style': () => {
      progress.hudStyle = hud.style === 'chalk' ? 'broadcast' : 'chalk';
      hud.setStyle(progress.hudStyle);
      save(progress);
    },
    'toggle-sound': () => {
      progress.muted = !progress.muted;
      sound.setMuted(progress.muted);
      save(progress);
      menus.setSoundIcon(progress.muted);
    },
  };
}
