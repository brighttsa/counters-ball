// Counters Ball 3D — bootstrap and app flow:
// title (live AI-vs-AI match behind the menu) → pitch select → intro flyover
// → match → full-time results → next pitch. Persistent renderer, post stack,
// camera director and audio; one MatchSession per venue.
import { createRendererSceneCamera } from './scene/scene-and-lighting-setup.js';
import { createPostProcessing } from './fx/post-processing-bloom-grain-haze.js';
import { CameraDirector } from './fx/camera-director-attract-intro-play-goal.js';
import { PlayerCameraController } from './fx/player-camera-controller.js';
import { createMatchOrientationPrompt } from './ui/match-orientation-prompt.js';
import { ProceduralSoundBoard } from './audio/procedural-sound-effects-web-audio.js';
import { MatchSession } from './gameplay/match-session-runtime.js';
import { MenuScreens } from './ui/ui-menu-screens-title-levels-intro.js';
import { MatchHud } from './ui/ui-match-hud-scoreboard-callouts-and-tutorial.js';
import { FullTimeResultsCard, fullTimeTitle } from './ui/ui-full-time-results-card.js';
import { ResultsShare, buildResultShare } from './ui/share-results-and-challenge-link.js';
import { HotSeatRivalry } from './core/hot-seat-series-and-rivalry-record.js';
import {
  decodeChallenge, stripChallengeParams, challengeInviteLine, challengeVerdictLine, markText,
} from './core/challenge-link-codec-and-comparison.js';
import { startGameRenderLoop } from './core/game-render-loop-and-viewport.js';
import { CAMPAIGN_LEVELS, HOME_TEAM } from './levels/campaign-level-definitions.js';
import { STREET_LEGENDS_ACTS, isLegendActUnlocked } from './levels/street-legends-acts-and-unlocks.js';
import { pickFeaturedLegendAct } from './levels/featured-home-legends-act.js';
import { createChalkTableScoreboard } from './scene/chalk-table-score-and-flick-tallies.js';
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
const resultsCard = new FullTimeResultsCard();
const resultsShare = new ResultsShare(document.getElementById('results-share-status'));
const hotSeat = new HotSeatRivalry(progress, saveProgress);
const silentHud = new Proxy({}, { get: () => () => {} }); // the attract match talks to nobody

const app = { mode: 'campaign', levelIndex: 0, session: null, paused: false, challenge: null };
const orientation = createMatchOrientationPrompt();
new PlayerCameraController(app, cameraDirector);
const trackFor = (mode) => (mode === 'legends' ? STREET_LEGENDS_ACTS : CAMPAIGN_LEVELS);
const challengeFor = (level) => (app.challenge?.levelId === level?.id ? app.challenge : null);
const unlockedIn = (mode, i) => mode === 'versus' || Boolean(challengeFor(trackFor(mode)[i])) // a friend's link opens its table
  || (mode === 'legends' ? isLegendActUnlocked(progress, STREET_LEGENDS_ACTS, i) : isLevelUnlocked(progress, CAMPAIGN_LEVELS, i));
const featuredIndex = () => pickFeaturedLegendAct(STREET_LEGENDS_ACTS, progress);

function replaceSession(options, sessionHud) {
  resultsCard.cancelReveal();
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
  const level = { ...STREET_LEGENDS_ACTS[featuredIndex()],
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
  app.challenge = null;
  ensureAttractMode();
  menus.setHomeFeature(STREET_LEGENDS_ACTS[featuredIndex()]);
  menus.setTitleStars(totalStars(progress, CAMPAIGN_LEVELS), CAMPAIGN_LEVELS.length * 3);
  menus.show('title');
}

/** A "beat me" link opened the page: name the table and the friend's mark before anything else. */
function showChallenge() {
  ensureAttractMode();
  const level = trackFor(app.challenge.mode)[app.challenge.index];
  menus.fillChallenge(level, challengeInviteLine(app.challenge, level));
  menus.show('challenge');
}

function takeChallengeFromUrl() {
  if (!location.search) return null;
  const challenge = decodeChallenge(location.search);
  history.replaceState(null, '', stripChallengeParams(location.href)); // a reload lands on the title, not the challenge again
  const index = challenge ? trackFor(challenge.mode).findIndex((level) => level.id === challenge.levelId) : -1;
  return index < 0 ? null : { ...challenge, index };
}

function showLevels(mode = app.mode) {
  app.challenge = null;
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

/** @param rematch 2-Player Rematch: same table, next game of the series, straight to kick-off */
function prepareMatch(index, { rematch = false } = {}) {
  const track = trackFor(app.mode);
  const level = track[index];
  if (!level || !unlockedIn(app.mode, index)) return showLevels();
  if (orientation.offer(() => prepareMatch(index, { rematch }))) return;
  const versus = app.mode === 'versus';
  app.levelIndex = index;
  if (app.mode === 'legends') { progress.lastLegendAct = level.id; saveProgress(progress); }
  replaceSession({
    level, homeTeam: HOME_TEAM, awayTeam: level.opponent.team,
    controllers: { home: 'human', away: versus ? 'human' : 'ai' },
    playerNames: versus ? hotSeat.names : undefined,
    onEnd: (result) => showResults(result),
  }, hud);
  sound.setSfxLevel(1);
  sound.setAmbience(level.backdrop);
  hud.attachTableChalk(createChalkTableScoreboard(app.session.stage.group, HOME_TEAM.hudColor, level.opponent.team.hudColor));
  hud.reset(level, HOME_TEAM, level.opponent.team, versus);
  cameraDirector.playIntro(2.8);
  const challenge = challengeFor(level);
  menus.fillIntro(level, index, track.length, app.mode, HOME_TEAM, {
    names: hotSeat.names, rivalryFor: hotSeat.rivalryFor,
    lines: challenge ? [`Your friend's mark: ${markText(challenge)}`] : [],
  });
  if (rematch) return kickOff();
  menus.show('intro'); // the match waits for Kick Off: the rules card stays until the player has read it
}

function kickOff() {
  if (app.session.rules.phase !== 'waiting') return;
  cameraDirector.setMode('play');
  menus.show(null);
  hud.show(true);
  sound.whistle();
  if (app.mode !== 'versus') return app.session.start();
  const { side, label, detail } = hotSeat.seat(menus.readPlayerNames());
  hud.setNames(hotSeat.names.home, hotSeat.names.away);
  app.session.start(side);
  hud.event(label, { priority: 3, duration: 1.6, detail });
}

function showResults(result) {
  const track = trackFor(app.mode);
  const level = track[app.levelIndex];
  const campaign = app.mode !== 'versus';
  const improved = campaign && recordLevelStars(progress, level.id, result.stars);
  const names = campaign ? null : { ...hotSeat.names };
  const challenge = challengeFor(level);
  const lines = !campaign ? hotSeat.finish(result.winner) : challenge ? [challengeVerdictLine(result, challenge)] : [];
  hud.show(false);
  resultsShare.prepare(buildResultShare(result, level, app.mode, {
    baseUrl: `${location.origin}${location.pathname}`, title: fullTimeTitle(result, level, app.mode, names),
    homeColour: HOME_TEAM.hudColor, names, versusNotes: lines, challengeNote: lines[0],
  }));
  resultsCard.fill(result, level, app.mode, {
    names, lines, rematchLabel: hotSeat.seriesDecided ? 'New series' : 'Rematch',
    hasNext: campaign && result.stars > 0 && app.levelIndex < track.length - 1,
    isFinalVenue: app.levelIndex === track.length - 1,
    improved,
    onStar: (i) => sound.starDing(i),
    homeColour: HOME_TEAM.hudColor,
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
  'play-featured': () => { app.mode = 'legends'; prepareMatch(featuredIndex()); },
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
  replay: () => {
    if (app.mode !== 'versus') return prepareMatch(app.levelIndex);
    hotSeat.rematch();
    prepareMatch(app.levelIndex, { rematch: true });
  },
  'share-result': () => resultsShare.share(),
  'challenge-accept': () => { app.mode = app.challenge.mode; app.levelIndex = app.challenge.index; prepareMatch(app.challenge.index); },
  'challenge-decline': () => showTitle(),
  'next-level': () => prepareMatch(app.levelIndex + 1),
  'toggle-hud-style': () => {
    progress.hudStyle = hud.style === 'chalk' ? 'broadcast' : 'chalk';
    hud.setStyle(progress.hudStyle);
    saveProgress(progress);
  },
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
hud.setStyle(progress.hudStyle);
app.challenge = takeChallengeFromUrl();
if (app.challenge) showChallenge(); else showTitle();
startGameRenderLoop({ app, camera, cameraDirector, renderer, post });

window.__countersBall = { app, progress, levels: CAMPAIGN_LEVELS, legends: STREET_LEGENDS_ACTS, actions };
