// Counters Ball 3D — bootstrap and app flow:
// title (live AI-vs-AI match behind the menu) → pitch select → intro flyover
// → match → full-time results → next pitch. Persistent renderer, post stack,
// camera director and audio; one MatchSession per venue.
import { createRendererSceneCamera } from './scene/scene-and-lighting-setup.js';
import { createPostProcessing } from './fx/post-processing-bloom-grain-haze.js';
import { CameraDirector } from './fx/camera-director-attract-intro-play-goal.js';
import { ProceduralSoundBoard } from './audio/procedural-sound-effects-web-audio.js';
import { MatchSession } from './gameplay/match-session-runtime.js';
import { MenuScreens } from './ui/ui-menu-screens-title-levels-intro.js';
import { MatchHud } from './ui/ui-match-hud-pause-and-results.js';
import { CAMPAIGN_LEVELS, ATTRACT_MODE_LEVEL, HOME_TEAM } from './levels/campaign-level-definitions.js';
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
const AMBIENCE = { 'night-bulb': 'night', harmattan: 'harmattan' };

function replaceSession(options, sessionHud) {
  hud.cancelResultReveal(); // leaving results early must not ding stars into the next screen
  app.session?.dispose();
  app.paused = false;
  app.session = new MatchSession({ renderer, scene, camera, canvas, cameraDirector, post, sound, hud: sessionHud }, options);
}

function ensureAttractMode() {
  if (app.session?.options.isAttract) return;
  const level = ATTRACT_MODE_LEVEL;
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
  menus.setTitleStars(totalStars(progress), CAMPAIGN_LEVELS.length * 3);
  menus.show('title');
}

function showLevels(mode = app.mode) {
  app.mode = mode;
  ensureAttractMode();
  menus.renderLevels(CAMPAIGN_LEVELS, progress, mode,
    (i) => mode === 'versus' || isLevelUnlocked(progress, CAMPAIGN_LEVELS, i));
  menus.show('levels');
}

function prepareMatch(index) {
  const level = CAMPAIGN_LEVELS[index];
  if (!level) return showLevels();
  const versus = app.mode === 'versus';
  app.levelIndex = index;
  replaceSession({
    level, homeTeam: HOME_TEAM, awayTeam: level.opponent.team,
    controllers: { home: 'human', away: versus ? 'human' : 'ai' },
    onEnd: (result) => showResults(result),
  }, hud);
  sound.setSfxLevel(1);
  sound.setAmbience(AMBIENCE[level.lighting] ?? 'day');
  hud.reset(level, HOME_TEAM, level.opponent.team, versus);
  cameraDirector.playIntro(2.6);
  menus.fillIntro(level, index, CAMPAIGN_LEVELS.length, app.mode, HOME_TEAM);
  menus.show('intro');
}

function kickOff() {
  menus.show(null);
  hud.show(true);
  sound.whistle();
  app.session.start();
}

function showResults(result) {
  const level = CAMPAIGN_LEVELS[app.levelIndex];
  const campaign = app.mode === 'campaign';
  const improved = campaign && recordLevelStars(progress, level.id, result.stars);
  hud.show(false);
  hud.fillResults(result, level, app.mode, {
    hasNext: campaign && result.stars > 0 && app.levelIndex < CAMPAIGN_LEVELS.length - 1,
    isFinalVenue: app.levelIndex === CAMPAIGN_LEVELS.length - 1,
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
  'play-campaign': () => showLevels('campaign'),
  'play-versus': () => showLevels('versus'),
  'back-to-title': () => showTitle(),
  'select-level': (el) => prepareMatch(Number(el.dataset.index)),
  'intro-back': () => showLevels(),
  'kick-off': () => kickOff(),
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
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // the window may change displays
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
  cameraDirector.fitToViewport();
});

let lastFrame = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  // rAF timestamps can predate the boot-time performance.now(): never let dt go negative.
  const dt = Math.max(0, Math.min((now - lastFrame) / 1000, 0.05));
  lastFrame = now;
  const t = now / 1000;
  app.session?.update(dt, t);
  cameraDirector.update(dt, t);
  post.update(dt, t);
  post.render();
}

menus.setSoundIcon(progress.muted);
showTitle();
requestAnimationFrame(frame);

// Inspection handle for automated verification.
window.__countersBall = { app, progress, levels: CAMPAIGN_LEVELS, actions };
