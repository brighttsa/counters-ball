// Wires physics and rules events to everything the player sees and hears:
// sounds, dust, springs, hit-stop, slow motion, camera, HUD and AI turns.
import {
  SIDE_HOME, SIDE_AWAY, GOAL_LINE_X, GOAL_HALF_WIDTH, MAX_FLICK_SPEED,
} from '../core/pitch-dimensions-and-constants.js';
import { createSchoolyardShotMemory } from '../core/schoolyard-shot-memory.js';
import { screenPan } from '../audio/screen-space-stereo-pan.js';
import { needsFirstShotGuidance, completeFirstShotGuidance } from '../core/first-shot-guidance.js';
import { MATCH_COPY, ordinaryGoalDetail } from './konk-match-reaction-copy.js';
import { CONTACT_RESTITUTION_SQUARE, RAIL_RESTITUTION } from './flick-feel-contact-rail-and-settle-rules.js';

const SURFACE_SOUND = { cap: 'capClink', coins: 'capClink', post: 'woodKnock', pebble: 'stoneClack', bottle: 'glassTink',
  boom: 'woodKnock', booth: 'stoneClack', kerb: 'stoneClack', ruler: 'woodKnock' };
// A full-speed square hit reads as strength 1.
const BODY_RESTITUTION_FACTOR = 1 + CONTACT_RESTITUTION_SQUARE;
const WALL_RESTITUTION_FACTOR = 1 + RAIL_RESTITUTION;

export function wireMatchFeedback(session) {
  const { physics, rules, sound, particles, juice, time, cameraDirector, post, hud, options, level } = session;
  const versus = options.controllers.home !== 'ai' && options.controllers.away !== 'ai'; // hot-seat or by message
  const localSide = options.localSide ?? null;
  const tableSurface = level.surface?.kind ?? 'cardboard';
  const shotMemory = createSchoolyardShotMemory(level, options);
  const entryByBody = new Map(session.entries.map((e) => [e.body, e]));
  // 2-Player seats go by the names typed on the intro card; the object is read live, so kick-off can fill it.
  const nameOf = (side) => options.playerNames?.[side] ?? (side === SIDE_HOME ? options.homeTeam.name : options.awayTeam.name);
  let lastHumanSide = null;
  let firstTurn = true;
  let lastTurnTime = 0;
  const goalCounts = { [SIDE_HOME]: 0, [SIDE_AWAY]: 0 };
  const kid = level.opponent.kid;
  const syncFlicks = () => hud.setFlicks(rules.flicksLeft(SIDE_HOME), rules.flicksLeft(SIDE_AWAY));

  physics.onImpact = (a, b, impulse, x, z) => {
    // Impulse → approach speed → 0..1 strength, so a paper ball and a cap compare fairly.
    const strength = Math.min(1, (impulse * (a.invMass + b.invMass)) / (BODY_RESTITUTION_FACTOR * MAX_FLICK_SPEED));
    if (rules.phase === 'moving') session.presentation.skills.impact(a, b, strength);
    session.mechanic?.noteImpact(a, b, strength);
    if (strength > 0.6) sound.event?.('hardContact', strength);
    const pan = screenPan(session.camera, x, z);
    const ball = a.kind === 'ball' ? a : b.kind === 'ball' ? b : null;
    if (ball) {
      const other = ball === a ? b : a;
      if (other.kind === 'cap') {
        sound.ballTap(strength, pan, tableSurface);
        juice.hopBall(strength);
        if (strength > 0.2) { // the strike: freeze a beat, then let it fly
          time.hitStop(0.02 + strength * 0.065);
          cameraDirector.addTrauma(strength * 0.3);
        }
        if (strength > 0.15 && Math.abs(Math.abs(x) - GOAL_LINE_X) < 0.08
          && Math.abs(z - (physics.goalCenters?.[Math.sign(x)] ?? 0)) < GOAL_HALF_WIDTH + 0.04) {
          sound.event?.('goalLineSave', strength);
        }
      } else {
        sound[SURFACE_SOUND[other.kind]]?.(strength, pan);
      }
      if (other.kind === 'post') {
        juice.wobbleGoal(Math.sign(other.pos.x), strength);
        cameraDirector.addTrauma(0.12);
      }
    } else {
      const otherKind = a.kind === 'cap' ? b.kind : a.kind;
      if (otherKind === 'cap') sound.capClink?.(strength, pan, tableSurface);
      else sound[SURFACE_SOUND[otherKind]]?.(strength, pan);
      if (strength > 0.35) cameraDirector.addTrauma(strength * 0.18);
    }
    for (const body of [a, b]) {
      const entry = entryByBody.get(body);
      if (!entry) continue;
      const dx = body.pos.x - x, dz = body.pos.y - z, d = Math.hypot(dx, dz) || 1;
      juice.hitCap(entry, strength, dx / d, dz / d);
    }
    particles.dustPuff(x, z, strength);
    session.inkBursts?.burst(x, z, strength);
  };

  physics.onWallHit = (body, impulse, x, z) => {
    const strength = Math.min(1, impulse / (WALL_RESTITUTION_FACTOR * body.mass * MAX_FLICK_SPEED));
    if (rules.phase === 'moving') session.presentation.skills.wall(body, strength);
    sound.woodKnock(strength * 0.8, screenPan(session.camera, x, z), tableSurface);
    if (strength > 0.25) particles.dustPuff(x, z, strength * 0.6);
  };

  physics.onGoalScored = (sign) => rules.registerGoal(sign);
  physics.onGoalDenied = () => {
    const hint = session.mechanic?.hint;
    if (!hint || options.isAttract) return;
    hud.event('NOT YET', { priority: 7, duration: 1.6, detail: hint.label });
    session.schedule(1.6, () => hud.event(hint.label, { priority: 2, duration: 1.8, detail: hint.detail }));
  };
  physics.onStep = (dt) => {
    if (rules.phase === 'moving') session.presentation.skills.update(dt, session.ballBody);
    if (rules.phase === 'moving') session.mechanic?.observe(session.ballBody);
  };

  rules.on('turn', (side) => {
    session.input.cancel();
    session.presentation.turn(side);
    syncFlicks();
    const now = performance.now();
    if (firstTurn) { firstTurn = false; if (!options.isAttract) sound.event?.('matchStart'); }
    else if (lastHumanSide && lastHumanSide !== side) {
      const gap = (now - lastTurnTime) / 1000;
      const pace = Math.min(1, Math.max(0.2, gap / 8));
      sound.event?.('turnChange', pace);
    }
    lastTurnTime = now;
    if (rules.isAi(side)) {
      hud.setTurn(side, `${side === SIDE_AWAY ? kid : nameOf(side)} lines up`);
      const difficulty = side === SIDE_AWAY ? level.opponent.difficulty : options.homeDifficulty;
      session.ai.takeTurn(side, session.entriesForSide(side), session.ballBody, difficulty);
    } else {
      hud.setTurn(side, versus ? side === localSide ? 'YOUR FLICK' : `${nameOf(side)}'s flick` : MATCH_COPY.soloTurn);
      // One phone, two players: say out loud whose hands it belongs in now.
      if (versus && lastHumanSide && lastHumanSide !== side) {
        hud.event(`${nameOf(side).toUpperCase()}'S FLICK`, { priority: 2, duration: 1.1, detail: MATCH_COPY.handover });
      }
      lastHumanSide = side;
      if (!options.isAttract && rules.isHuman(side) && (level.tutorial || needsFirstShotGuidance())) session.showTutorial();
    }
  });

  rules.on('flick', ({ side }) => {
    syncFlicks();
    if (!options.isAttract && rules.isHuman(side)) completeFirstShotGuidance();
    session.hideTutorial();
  });

  const origResolve = rules.resolvePlayAtRest.bind(rules);
  rules.resolvePlayAtRest = function () {
    if (session.slowMoUsed && rules.phase === 'moving') {
      sound.event?.('nearMiss');
      // The table gasps with you: a shot that nearly went in gets its own word, not just a sound.
      if (!options.isAttract && rules.isHuman(rules.turn)) hud.event('SO CLOSE!', { priority: 3, duration: 1.1 });
    }
    origResolve();
  };

  rules.on('goal', ({ scorer, scores }) => {
    goalCounts[scorer] += 1;
    // A venue's own hero moment outranks the generic skill label.
    const skillLabel = session.presentation.goal(scorer); // always: it also arms the replay
    const venueLabel = session.mechanic?.goalLabel(scorer);
    shotMemory.goal({ scorer, scores }, venueLabel);
    if (venueLabel) session.presentation.highlight = { ...session.presentation.highlight, label: venueLabel,
      replay: true, direction: scorer === SIDE_HOME ? 1 : -1 };
    const highlight = venueLabel || skillLabel;
    session.lastShotStory = highlight || 'GOAL';
    const goalX = (scorer === SIDE_HOME ? 1 : -1) * GOAL_LINE_X;
    sound.netCatch?.(screenPan(session.camera, goalX, 0)); // the ball settling in the net, under the whistle
    sound.whistle();
    if (!options.isAttract) sound.music?.duckForGoal(); // room for the whistle and the net
    session.stage.backdrop.startle(); // the neighbourhood reacts too
    particles.confettiBurst(goalX);
    juice.wobbleGoal(Math.sign(goalX), 0.6);
    cameraDirector.celebrateGoal(goalX);
    cameraDirector.addTrauma(0.28);
    post.pulseBloom(highlight ? 0.38 : 0.18);
    time.slowMotion(0.35, 0.7);
    hud.setScore(scores, scorer);
    const detail = highlight || ordinaryGoalDetail({ scorer, kid,
      names: { home: nameOf(SIDE_HOME), away: nameOf(SIDE_AWAY) }, versus, goalNumber: goalCounts[scorer] });
    hud.goal(session.inkBursts ? `${detail} / ${scores.home}-${scores.away}` : detail);
    session.schedule(2.6, () => session.presentation.afterGoal());
  });

  rules.on('kickoff', () => { session.presentation.skills.kickoff(); session.resetToKickoff(); });

  rules.on('tiebreak', (stage) => {
    const golden = stage === 'golden';
    hud.event(golden ? 'GOLDEN FLICK' : 'TWO MORE EACH', {
      priority: 6, duration: golden ? 1.8 : 1.5,
      detail: golden ? MATCH_COPY.goldenDetail : MATCH_COPY.extraDetail,
    });
    sound.event?.('matchPoint');
  });

  rules.on('end', (result) => {
    result.shotStory = session.lastShotStory || '';
    shotMemory.finish(result);
    session.ai.cancel();
    session.input.cancel();
    hud.setTurn(null, MATCH_COPY.fullTime);
    sound.whistle();
    if (result.winner && (versus || result.winner === SIDE_HOME)) sound.event?.('win');
    else if (result.winner && !versus && result.winner !== SIDE_HOME) sound.event?.('loss');
    hud.event(result.winner ? 'WINNER' : 'FULL TIME', { priority: 12, duration: 1.2 });
    // The opponent's goal confetti should not keep falling behind the player's loss card.
    const lost = !versus && result.winner !== SIDE_HOME;
    session.schedule(1.5, () => { if (lost) particles.clearConfetti(); options.onEnd?.(result); });
  });
}
