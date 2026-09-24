// Every [data-action] button in index.html, mapped to what it does. The app
// flow (title, levels, intro, match, results) lives in main.js; this is only
// the routing table plus the saved preference toggles.
import { applyAudioSettings, nextMusicVolume, DEFAULT_MUSIC_VOLUME } from '../audio/music-and-effects-audio-settings.js';

const ARM_SECONDS = 4;

/**
 * @param ctx { app, progress, save, flow, hud, sound, music, cameraDirector, hotSeat, resultsShare, menus }
 *   flow: { showTitle, showLevels, previewLevel, prepareMatch, kickOff, setPaused, featuredIndex }
 */
const VIEW_LABELS = { tactical: 'Tactical', broadcast: 'Broadcast', street: 'Street Level', free: 'Free Camera' };
const VIEW_ORDER = ['tactical', 'broadcast', 'street', 'free'];

export function createMenuActions({ app, progress, save, flow, hud, sound, music, cameraDirector, hotSeat, resultsShare, menus, hints }) {
  const audio = () => { save(progress); applyAudioSettings({ progress, sound, music, menus }); };
  const finishReplay = () => { if (app.session?.presentation.replay.active) app.session.presentation.finishReplay(); };
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
    'toggle-camera-motion': (el) => {
      cameraDirector.setMotion(!cameraDirector.motionEnabled);
      el.setAttribute('aria-pressed', String(cameraDirector.motionEnabled));
      if (!cameraDirector.motionEnabled) finishReplay();
    },
    pause: () => {
      armed.forEach(disarm);
      flow.setPaused(true);
      const byId = id => globalThis.document?.getElementById(id);
      const view = byId('camera-view-toggle'), tips = byId('hints-reset');
      if (view) view.dataset.value = VIEW_LABELS[cameraDirector?.playerControl?.mode] ?? 'Broadcast';
      if (tips) delete tips.dataset.value;
    },
    // Pause menu settings: step through the four views (the match shows the new one on Resume),
    // bring the one-time chalk tips back, or leave for Kwame's Corner.
    'cycle-camera-view': (el) => {
      const control = cameraDirector.playerControl;
      const next = VIEW_ORDER[(VIEW_ORDER.indexOf(control.mode) + 1) % VIEW_ORDER.length];
      control.select(next);
      el.dataset.value = VIEW_LABELS[control.mode];
    },
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
    'toggle-hud-style': () => {
      progress.hudStyle = hud.style === 'chalk' ? 'broadcast' : 'chalk';
      hud.setStyle(progress.hudStyle);
      save(progress);
    },
    'toggle-sound': () => { progress.muted = !progress.muted; audio(); },
    // Choosing a music level or switching effects on in the pause menu also lifts the ♪ all-sound mute.
    'cycle-music-volume': () => {
      progress.musicVolume = nextMusicVolume(progress.musicVolume ?? DEFAULT_MUSIC_VOLUME);
      progress.muted = false;
      audio();
    },
    'toggle-effects': () => { progress.effectsOff = !progress.effectsOff; progress.muted = false; audio(); },
  };
}
