// Every [data-action] button in index.html, mapped to what it does. The app
// flow (title, levels, intro, match, results) lives in main.js; this is only
// the routing table plus the saved preference toggles.
import { applyAudioSettings, MUSIC_LEVELS } from '../audio/music-and-effects-audio-settings.js';
import { markChoice, showPauseFace } from './pause-card-faces-and-setting-chips.js';

const ARM_SECONDS = 4;

/**
 * @param ctx { app, progress, save, flow, hud, sound, music, cameraDirector, hotSeat, resultsShare, menus }
 *   flow: { showTitle, showLevels, previewLevel, prepareMatch, kickOff, setPaused, featuredIndex }
 */
const VIEWS = ['tactical', 'broadcast', 'street', 'free'];

export function createMenuActions({ app, progress, save, flow, hud, sound, music, cameraDirector, hotSeat, resultsShare, menus, hints }) {
  const audio = () => { save(progress); applyAudioSettings({ progress, sound, music, menus }); };
  const finishReplay = () => { if (app.session?.presentation.replay.active) app.session.presentation.finishReplay(); };
  // The chips on the back of the pause card. Unknown values are ignored, so a stale chip can't save junk.
  // Choosing a music level or switching effects on also lifts the ♪ all-sound mute: the player wants sound.
  const choose = {
    music: (value) => {
      const level = MUSIC_LEVELS.find((l) => String(l.value) === value);
      if (!level) return;
      progress.musicVolume = level.value;
      progress.muted = false;
      audio();
    },
    effects: (value) => { progress.effectsOff = value === 'off'; progress.muted = false; audio(); },
    view: (value) => {
      if (!VIEWS.includes(value)) return;
      cameraDirector.playerControl.select(value); // the match shows the new view on Resume
      markChoice('view', cameraDirector.playerControl.mode);
    },
    motion: (value) => {
      cameraDirector.setMotion(value === 'on');
      markChoice('motion', cameraDirector.motionEnabled ? 'on' : 'off');
      if (!cameraDirector.motionEnabled) finishReplay();
    },
    scoreboard: (value) => {
      progress.hudStyle = value === 'broadcast' ? 'broadcast' : 'chalk';
      hud.setStyle(progress.hudStyle);
      save(progress);
    },
  };
  // Restart and Quit throw a match away. Once a flick has been played, the first press only arms the
  // button ("Sure? Press again…"); a second press within a few seconds acts. Works the same by keyboard.
  const armed = new Set();
  const disarm = (el) => {
    clearTimeout(el.disarmTimer);
    if (el.dataset.armed === 'true') el.textContent = el.dataset.label;
    delete el.dataset.armed;
    armed.delete(el);
  };
  const confirmed = (el, prompt) => {
    const s = app.session;
    const inPlay = s && !s.options.isAttract && s.rules.phase !== 'ended'
      && s.rules.flicksUsed.home + s.rules.flicksUsed.away > 0;
    if (!inPlay || el.dataset.armed === 'true') { disarm(el); return true; }
    el.dataset.armed = 'true';
    el.dataset.label = el.textContent;
    el.textContent = prompt;
    el.disarmTimer = setTimeout(() => disarm(el), ARM_SECONDS * 1000);
    el.disarmTimer?.unref?.();
    armed.add(el);
    return false;
  };
  return {
    'play-featured': () => { app.mode = 'legends'; flow.prepareMatch(flow.featuredIndex()); },
    'play-campaign': () => flow.showLevels('campaign'),
    'play-practice': () => { app.mode = 'practice'; flow.prepareMatch(0); },
    'play-versus': () => flow.showLevels('versus'),
    'play-legends': () => flow.showLevels('legends'),
    'back-to-title': () => flow.showTitle(),
    'select-level': (el) => flow.prepareMatch(Number(el.dataset.index)),
    'preview-level': (el) => flow.previewLevel(Number(el.dataset.index)),
    'intro-back': () => flow.showLevels(),
    'kick-off': () => flow.kickOff(),
    'skip-replay': finishReplay,
    // Pausing always opens on the front of the card; the view chip follows any mid-match camera change.
    pause: () => {
      armed.forEach(disarm);
      showPauseFace('actions');
      flow.setPaused(true);
      markChoice('view', cameraDirector?.playerControl?.mode ?? 'broadcast');
      const tips = globalThis.document?.getElementById('hints-reset');
      if (tips) delete tips.dataset.value;
    },
    'open-settings': () => showPauseFace('settings'),
    'close-settings': () => showPauseFace('actions'),
    'choose-setting': (el) => choose[el.dataset.choice]?.(el.dataset.value),
    'reset-hints': (el) => { hints.reset(); el.dataset.value = 'On'; },
    'how-to-play': (el) => {
      if (!confirmed(el, 'Sure? Press again to leave for practice')) return;
      app.mode = 'practice';
      flow.prepareMatch(0);
    },
    'skip-practice': () => {
      progress.practiceSkipped = true;
      save(progress);
      menus.setFirstLaunch(false);
      app.mode = 'legends';
      flow.prepareMatch(flow.featuredIndex());
    },
    resume: () => flow.setPaused(false),
    restart: (el) => { if (confirmed(el, 'Sure? Press again to restart')) flow.prepareMatch(app.levelIndex); },
    quit: (el) => { if (confirmed(el, 'Sure? Press again to quit')) flow.showLevels(); },
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
    'toggle-sound': () => { progress.muted = !progress.muted; audio(); },
  };
}
