// Wires physics and rules events to everything the player sees and hears:
// sounds, dust, springs, hit-stop, slow motion, camera, HUD and AI turns.
import {
  SIDE_HOME, SIDE_AWAY, GOAL_LINE_X, MAX_FLICK_SPEED,
} from '../core/pitch-dimensions-and-constants.js';
import { createSchoolyardShotMemory } from '../core/schoolyard-shot-memory.js';
import { screenPan } from '../audio/screen-space-stereo-pan.js';

const SURFACE_SOUND = { cap: 'capClink', coins: 'capClink', post: 'woodKnock', pebble: 'stoneClack', bottle: 'glassTink',
  boom: 'woodKnock', booth: 'stoneClack', kerb: 'stoneClack', ruler: 'woodKnock' };
const BODY_RESTITUTION_FACTOR = 1.72;
const WALL_RESTITUTION_FACTOR = 1.55;

export function wireMatchFeedback(session) {
  const { physics, rules, sound, particles, juice, time, cameraDirector, post, hud, options, level } = session;
  const versus = options.controllers.home === 'human' && options.controllers.away === 'human';
  const shotMemory = createSchoolyardShotMemory(level, options);
  const entryByBody = new Map(session.entries.map((e) => [e.body, e]));
  const nameOf = (side) => (side === SIDE_HOME ? options.homeTeam.name : options.awayTeam.name);
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
        sound.ballTap(strength, pan);
        juice.hopBall(strength);
        if (strength > 0.2) { // the strike: freeze a beat, then let it fly
          time.hitStop(0.02 + strength * 0.065);
          cameraDirector.addTrauma(strength * 0.3);
        }
      } else {
        sound[SURFACE_SOUND[other.kind]]?.(strength, pan);
      }
      if (other.kind === 'post') {
        juice.wobbleGoal(Math.sign(other.pos.x), strength);
        cameraDirector.addTrauma(0.12);
      }
    } else {
      sound[SURFACE_SOUND[a.kind === 'cap' ? b.kind : a.kind]]?.(strength, pan);
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
    sound.woodKnock(strength * 0.8, screenPan(session.camera, x, z));
    if (strength > 0.25) particles.dustPuff(x, z, strength * 0.6);
  };

  physics.onGoalScored = (sign) => rules.registerGoal(sign);
  physics.onStep = (dt) => {
    if (rules.phase === 'moving') session.presentation.skills.update(dt, session.ballBody);
    if (rules.phase === 'moving') session.mechanic?.observe(session.ballBody);
  };

  rules.on('turn', (side) => {
    session.input.cancel();
    session.presentation.turn(side);
    syncFlicks();
    if (rules.isAi(side)) {
      hud.setTurn(side, `${side === SIDE_AWAY ? kid : nameOf(side)} is lining up…`);
      const difficulty = side === SIDE_AWAY ? level.opponent.difficulty : options.homeDifficulty;
      session.ai.takeTurn(side, session.entriesForSide(side), session.ballBody, difficulty);
    } else {
      hud.setTurn(side, versus ? `${nameOf(side)} to flick` : 'Your flick');
      if (level.tutorial) session.showTutorial();
    }
  });

  rules.on('flick', () => {
    syncFlicks();
    session.hideTutorial();
  });

  rules.on('goal', ({ scorer, scores }) => {
    // A venue's own hero moment outranks the generic skill label.
    const skillLabel = session.presentation.goal(scorer); // always: it also arms the replay
    const venueLabel = session.mechanic?.goalLabel(scorer);
    shotMemory.goal({ scorer, scores }, venueLabel);
    if (venueLabel) session.presentation.highlight = { ...session.presentation.highlight, label: venueLabel,
      replay: true, direction: scorer === SIDE_HOME ? 1 : -1 };
    const highlight = venueLabel || skillLabel;
    const goalX = (scorer === SIDE_HOME ? 1 : -1) * GOAL_LINE_X;
    sound.netCatch?.(screenPan(session.camera, goalX, 0)); // the ball settling in the net, under the whistle
    sound.whistle();
    session.stage.backdrop.startle(); // the neighbourhood reacts too
    particles.confettiBurst(goalX);
    juice.wobbleGoal(Math.sign(goalX), 0.6);
    cameraDirector.celebrateGoal(goalX);
    cameraDirector.addTrauma(0.28);
    post.pulseBloom(highlight ? 0.38 : 0.18);
    time.slowMotion(0.35, 0.7);
    hud.setScore(scores, scorer);
    const detail = highlight || (versus ? `${nameOf(scorer)}.` : scorer === SIDE_HOME ? 'Yours.' : `${kid} scores`);
    hud.goal(session.inkBursts ? `${detail} / ${scores.home}-${scores.away} / ${level.place}` : detail);
    session.schedule(2.6, () => session.presentation.afterGoal());
  });

  rules.on('kickoff', () => { session.presentation.skills.kickoff(); session.resetToKickoff(); });

  rules.on('end', (result) => {
    shotMemory.finish(result);
    session.ai.cancel();
    session.input.cancel();
    hud.setTurn(null, 'Full time!');
    sound.whistle();
    if (result.winner && (versus || result.winner === SIDE_HOME)) sound.event?.('win');
    hud.event(result.winner ? 'WINNER' : 'FULL TIME', { priority: 12, duration: 1.2 });
    session.schedule(1.5, () => options.onEnd?.(result));
  });
}
