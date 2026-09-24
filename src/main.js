// KONK! (bottle-cap football) — bootstrap and app flow:
// title (live AI-vs-AI match behind the menu) → pitch select → intro flyover
// → match → full-time results → next pitch. Persistent renderer, post stack,
// camera director and audio; one MatchSession per venue.
import { createRendererSceneCamera } from './scene/scene-and-lighting-setup.js';
import { createPostProcessing } from './fx/post-processing-bloom-grain-haze.js';
import { createAdaptiveQuality } from './fx/adaptive-render-quality.js';
import { CameraDirector } from './fx/camera-director-attract-intro-play-goal.js';
import { PlayerCameraController } from './fx/player-camera-controller.js';
import { createMatchOrientationPrompt } from './ui/match-orientation-prompt.js';
import { ProceduralSoundBoard } from './audio/procedural-sound-effects-web-audio.js';
import { SoundtrackDirector } from './audio/soundtrack-music-director.js';
import { wireSoundtrack } from './audio/soundtrack-app-wiring.js';
import { MatchSession } from './gameplay/match-session-runtime.js';
import { MenuScreens } from './ui/ui-menu-screens-title-levels-intro.js';
import { MatchHud } from './ui/ui-match-hud-scoreboard-callouts-and-tutorial.js';
import { FullTimeResultsCard } from './ui/ui-full-time-results-card.js';
import { ResultsShare } from './ui/share-results-and-challenge-link.js';
import { presentFullTimeResults } from './ui/full-time-results-presentation.js';
import { createMenuActions } from './ui/menu-button-action-routes.js';
import { pauseFace, showPauseFace } from './ui/pause-card-faces-and-setting-chips.js';
import { HotSeatRivalry } from './core/hot-seat-series-and-rivalry-record.js';
import { challengeInviteLine, markText } from './core/challenge-link-codec-and-comparison.js';
import { startGameRenderLoop } from './core/game-render-loop-and-viewport.js';
import { JustInTimeChalkHints } from './ui/just-in-time-chalk-hints.js';
import { KwameCornerCoach } from './ui/kwame-corner-practice-coach.js';
import { CAMPAIGN_LEVELS, HOME_TEAM } from './levels/campaign-level-definitions.js';
import { STREET_LEGENDS_ACTS } from './levels/street-legends-acts-and-unlocks.js';
import {
  trackFor, challengeForLevel, isTrackLevelUnlocked, takeChallengeFromUrl,
} from './levels/level-tracks-and-challenge-unlocks.js';
import { pickFeaturedLegendAct } from './levels/featured-home-legends-act.js';
import { createChalkTableScoreboard } from './scene/chalk-table-score-and-flick-tallies.js';
import { loadProgress, saveProgress, totalStars } from './core/save-progress-local-storage.js';

const canvas = document.getElementById('game-canvas');
const { renderer, scene, camera } = createRendererSceneCamera(canvas);
const post = createPostProcessing(renderer, scene, camera);
const adaptiveQuality = createAdaptiveQuality(renderer, post, scene);
const cameraDirector = new CameraDirector(camera, scene);
const progress = loadProgress();
const sound = new ProceduralSoundBoard({ muted: progress.muted });
const music = new SoundtrackDirector();
const hud = new MatchHud();
const resultsCard = new FullTimeResultsCard();
const resultsShare = new ResultsShare(document.getElementById('results-share-status'));
const hotSeat = new HotSeatRivalry(progress, saveProgress);
const silentHud = new Proxy({}, { get: () => () => {} }); // the attract match talks to nobody

const app = { mode: 'campaign', levelIndex: 0, session: null, paused: false, challenge: null };
const orientation = createMatchOrientationPrompt();
new PlayerCameraController(app, cameraDirector);
const challengeFor = (level) => challengeForLevel(app.challenge, level);
const unlockedIn = (mode, i) => isTrackLevelUnlocked(progress, mode, i, app.challenge);
const featuredIndex = () => pickFeaturedLegendAct(STREET_LEGENDS_ACTS, progress);

function replaceSession(options, sessionHud) {
  resultsCard.cancelReveal();
  app.practice?.dispose();
  app.practice = null;
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
  menus.setFirstLaunch(!progress.practiceDone && !progress.practiceSkipped);
  menus.show('title');
}

/** A "beat me" link opened the page: name the table and the friend's mark before anything else. */
function showChallenge() {
  ensureAttractMode();
  const level = trackFor(app.challenge.mode)[app.challenge.index];
  menus.fillChallenge(level, challengeInviteLine(app.challenge, level));
  menus.show('challenge');
}

function showLevels(mode = app.mode) {
  if (mode === 'practice') return showTitle(); // Kwame's Corner has no table list: Back and Quit go home
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
  if (level.practice) app.practice = new KwameCornerCoach(app.session, { onComplete: finishPractice });
  const challenge = challengeFor(level);
  menus.fillIntro(level, index, track.length, app.mode, HOME_TEAM, {
    names: hotSeat.names, rivalryFor: hotSeat.rivalryFor,
    lines: challenge ? [`Your friend's mark: ${markText(challenge)}`] : [],
  });
  if (rematch) return kickOff();
  menus.show('intro'); // the match waits for Kick Off: the rules card stays until the player has read it
}

/** Kwame's Corner is done: remember it and go back to the title screen. */
function finishPractice() {
  progress.practiceDone = true;
  saveProgress(progress);
  showTitle();
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
  hud.event(label, { priority: 5, duration: 1.6, detail }); // above MATCH POINT (4): a first-to-1 table is match point from flick one
}

function showResults(result) {
  const track = trackFor(app.mode);
  const level = track[app.levelIndex];
  hud.show(false);
  presentFullTimeResults(result, {
    level, mode: app.mode, levelIndex: app.levelIndex, trackLength: track.length, progress, hotSeat,
    challenge: challengeFor(level), card: resultsCard, share: resultsShare, homeColour: HOME_TEAM.hudColor,
    baseUrl: `${location.origin}${location.pathname}`, onStar: (i) => sound.starDing(i),
  });
  menus.show('results');
}

function setPaused(paused) {
  if (!app.session || app.session.options.isAttract) return;
  app.paused = paused;
  app.session.setPaused(paused);
  menus.show(paused ? 'pause' : null);
}

const menus = new MenuScreens((action, el) => {
  sound.unlock();
  if (action !== 'toggle-sound') sound.uiTick();
  actions[action]?.(el);
});
const chalkHints = new JustInTimeChalkHints();
const actions = createMenuActions({
  app, progress, save: saveProgress, hud, sound, music, cameraDirector, hotSeat, resultsShare, menus, hints: chalkHints,
  flow: { showTitle, showLevels, previewLevel, prepareMatch, kickOff, setPaused, featuredIndex },
});

window.addEventListener('pointerdown', () => sound.unlock());
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (menus.current === 'pause' && pauseFace() === 'settings') showPauseFace('actions'); // Esc turns the card back first
  else if (menus.current === 'pause') setPaused(false);
  else if (menus.current === null && app.session && !app.session.options.isAttract) actions.pause();
});

wireSoundtrack({ app, sound, music, menus, progress });
hud.setStyle(progress.hudStyle);
app.challenge = takeChallengeFromUrl();
if (app.challenge) showChallenge(); else showTitle();
startGameRenderLoop({ app, camera, cameraDirector, renderer, post, adaptiveQuality,
  onFrame: (dt) => {
    chalkHints.update(app.session, camera, cameraDirector.playerControl, dt);
    app.practice?.update(camera, cameraDirector.playerControl, dt);
  } });

window.__countersBall = { app, progress, levels: CAMPAIGN_LEVELS, legends: STREET_LEGENDS_ACTS, actions, music, sound };
