// Counters Ball 3D — bootstrap and app flow:
// title (live AI-vs-AI match behind the menu) → pitch select → intro flyover
// → match → full-time results → next pitch. Persistent renderer, post stack,
// camera director and audio; one MatchSession per venue.
import { createRendererSceneCamera } from './scene/scene-and-lighting-setup.js';
import { createPostProcessing } from './fx/post-processing-bloom-grain-haze.js';
import { CameraDirector } from './fx/camera-director-attract-intro-play-goal.js';
import { PlayerCameraController } from './fx/player-camera-controller.js';
import { ProceduralSoundBoard } from './audio/procedural-sound-effects-web-audio.js';
import { MatchSession } from './gameplay/match-session-runtime.js';
import { MenuScreens } from './ui/ui-menu-screens-title-levels-intro.js';
import { MatchHud } from './ui/ui-match-hud-pause-and-results.js';
import { startGameRenderLoop } from './core/game-render-loop-and-viewport.js';
import { CAMPAIGN_LEVELS, HOME_TEAM } from './levels/campaign-level-definitions.js';
import { STREET_LEGENDS_ACTS, isLegendActUnlocked } from './levels/street-legends-acts-and-unlocks.js';
import {
  loadProgress, saveProgress, recordLevelStars, isLevelUnlocked, totalStars,
} from './core/save-progress-local-storage.js';

const canvas = document.getElementById('game-canvas');
const { renderer, scene, camera } = createRendererSceneCamera(canvas);
const post = createPostProcessing(renderer, scene, camera);
const cameraDirector = new CameraDirector(camera, scene);
const progress = loadProgress();
const sound = new ProceduralSoundBoard({ muted: progress.muted });
const hud = new MatchHud();
const silentHud = new Proxy({}, { get: () => () => {} }); // the attract match talks to nobody

const app = { mode: 'campaign', levelIndex: 0, session: null, paused: false };
new PlayerCameraController(app, cameraDirector);
// Street Legends is its own track of acts; campaign and 2-player share the classic circuit.
const trackFor = (mode) => (mode === 'legends' ? STREET_LEGENDS_ACTS : CAMPAIGN_LEVELS);
const unlockedIn = (mode, i) => mode === 'versus'
  || (mode === 'legends' ? isLegendActUnlocked(progress, STREET_LEGENDS_ACTS, i) : isLevelUnlocked(progress, CAMPAIGN_LEVELS, i));
const featuredIndex = STREET_LEGENDS_ACTS.findIndex(level => level.id === 'legends-roadside-act-1');

function replaceSession(options, sessionHud) {
  hud.cancelResultReveal(); // leaving results early must not ding stars into the next screen
  app.session?.dispose();
  app.paused = false;
  sound.setPaused?.(false);
  sound.setHeat?.(0);
  sound.setTension?.(false);
  cameraDirector.setVenue(options.level.backdrop);
  cameraDirector.poster = Boolean(options.isAttract && options.level.mechanic?.type === 'toll-gates');
  document.body.classList.add('ink-game');
  app.session = new MatchSession({ renderer, scene, camera, canvas, cameraDirector, post, sound, hud: sessionHud }, options);
}

function ensureAttractMode() {
  if (app.session?.options.isAttract) return;
  const level = { ...STREET_LEGENDS_ACTS[featuredIndex],
    rules: { goalsToWin: 99, flickLimit: 999, threeStarFlicks: 3 }, awaySlots: null, homeDifficulty: 'easy' };
  replaceSession({
    level, homeTeam: HOME_TEAM, awayTeam: level.opponent.team, isAttract: true,
    controllers: { home: 'ai', away: 'ai' }, homeDifficulty: level.homeDifficulty,
    onEnd: () => { // a very long idle title screen can exhaust even 999 flicks: start a fresh match
      if (!app.session?.options.isAttract) return;
      app.session.dispose();
      app.session = null;
      ensureAttractMode();
    },
  }, silentHud);
  hud.show(false);
  sound.setSfxLevel(0.35);
  sound.setAmbience('day');
  cameraDirector.setMode('attract');
  app.session.start();
}

function showTitle() {
  ensureAttractMode();
  menus.setTitleStars(totalStars(progress, CAMPAIGN_LEVELS), CAMPAIGN_LEVELS.length * 3);
  menus.show('title');
}

function showLevels(mode = app.mode) {
  if (mode !== app.mode && (mode === 'legends' || app.mode === 'legends')) app.levelIndex = 0; // different track
  app.mode = mode;
  menus.renderLevels(trackFor(mode), progress, mode, (i) => unlockedIn(mode, i));
  menus.show('levels');
  previewLevel(app.levelIndex);
}

function previewLevel(index) {
  const level = trackFor(app.mode)[index];
  if (!level) return;
  replaceSession({ level, homeTeam: HOME_TEAM, awayTeam: level.opponent.team,
    controllers: { home: 'human', away: 'human' }, isPreview: true }, silentHud);
  hud.show(false);
  sound.setAmbience(level.backdrop);
  cameraDirector.setMode('attract');
  menus.previewLevel(level, index, unlockedIn(app.mode, index), app.mode);
}

function prepareMatch(index) {
  const track = trackFor(app.mode);
  const level = track[index];
  if (!level || !unlockedIn(app.mode, index)) return showLevels();
  const versus = app.mode === 'versus';
  app.levelIndex = index;
  replaceSession({
    level, homeTeam: HOME_TEAM, awayTeam: level.opponent.team,
    controllers: { home: 'human', away: versus ? 'human' : 'ai' },
    onEnd: (result) => showResults(result),
  }, hud);
  sound.setSfxLevel(1);
  sound.setAmbience(level.backdrop);
  hud.reset(level, HOME_TEAM, level.opponent.team, versus);
  cameraDirector.playIntro(2.8);
  menus.fillIntro(level, index, track.length, app.mode, HOME_TEAM);
  menus.show('intro');
  const session = app.session;
  session.schedule(3, () => { if (app.session === session && menus.current === 'intro') kickOff(); });
}

function kickOff() {
  if (app.session.rules.phase !== 'waiting') return;
  cameraDirector.setMode('play');
  menus.show(null);
  hud.show(true);
  sound.whistle();
  app.session.start();
}

function showResults(result) {
  const track = trackFor(app.mode);
  const level = track[app.levelIndex];
  const campaign = app.mode !== 'versus';
  const improved = campaign && recordLevelStars(progress, level.id, result.stars);
  hud.show(false);
  hud.fillResults(result, level, app.mode, {
    hasNext: campaign && result.stars > 0 && app.levelIndex < track.length - 1,
    isFinalVenue: app.levelIndex === track.length - 1,
    improved,
    onStar: (i) => sound.starDing(i),
  });
  menus.show('results');
}

function setPaused(paused) {
  if (!app.session || app.session.options.isAttract) return;
  app.paused = paused;
  app.session.setPaused(paused);
  menus.show(paused ? 'pause' : null);
}

const actions = {
  'play-featured': () => { app.mode = 'legends'; prepareMatch(featuredIndex); },
  'play-campaign': () => showLevels('campaign'),
  'play-versus': () => showLevels('versus'),
  'play-legends': () => showLevels('legends'),
  'back-to-title': () => showTitle(),
  'select-level': (el) => prepareMatch(Number(el.dataset.index)),
  'preview-level': (el) => previewLevel(Number(el.dataset.index)),
  'intro-back': () => showLevels(),
  'kick-off': () => kickOff(),
  'skip-replay': () => { if (app.session?.presentation.replay.active) app.session.presentation.finishReplay(); },
  'toggle-camera-motion': (el) => {
    cameraDirector.setMotion(!cameraDirector.motionEnabled);
    el.setAttribute('aria-pressed', String(cameraDirector.motionEnabled));
    if (!cameraDirector.motionEnabled && app.session?.presentation.replay.active) app.session.presentation.finishReplay();
  },
  pause: () => setPaused(true),
  resume: () => setPaused(false),
  restart: () => prepareMatch(app.levelIndex),
  quit: () => showLevels(),
  'results-levels': () => showLevels(),
  replay: () => prepareMatch(app.levelIndex),
  'next-level': () => prepareMatch(app.levelIndex + 1),
  'toggle-sound': () => {
    progress.muted = !progress.muted;
    sound.setMuted(progress.muted);
    saveProgress(progress);
    menus.setSoundIcon(progress.muted);
  },
};

const menus = new MenuScreens((action, el) => {
  sound.unlock();
  if (action !== 'toggle-sound') sound.uiTick();
  actions[action]?.(el);
});

window.addEventListener('pointerdown', () => sound.unlock());
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (menus.current === 'pause') setPaused(false);
  else if (menus.current === null && app.session && !app.session.options.isAttract) setPaused(true);
});

menus.setSoundIcon(progress.muted);
showTitle();
startGameRenderLoop({ app, camera, cameraDirector, renderer, post });

// Inspection handle for automated verification.
window.__countersBall = { app, progress, levels: CAMPAIGN_LEVELS, legends: STREET_LEGENDS_ACTS, actions };
