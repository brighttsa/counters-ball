// One match on one venue: builds the stage, owns physics, rules, input, AI
// and feedback systems, and runs the per-frame update. Timers run on
// pausable game time. Dispose it and the venue leaves no trace.
import * as THREE from 'three';
import { buildLevelStage } from '../scene/level-stage-builder-and-disposal.js';
import { FlickPhysicsEngine } from './flick-physics-engine.js';
import { MatchRules } from './match-rules-turns-goals-and-results.js';
import { AimVisuals } from './aim-trajectory-power-ring-and-rim-glow.js';
import { HumanDragAimInput } from './human-drag-aim-input.js';
import { AiTurnPerformer } from './ai-opponent-turn-performer.js';
import { wireMatchFeedback } from './match-session-feedback-hooks.js';
import { JuiceAnimator } from '../fx/cap-ball-goal-juice-springs.js';
import { ImpactParticles } from '../fx/impact-dust-puffs-and-goal-confetti.js';
import { GameTimeController } from '../core/game-time-hit-stop-and-slow-motion.js';
import { createSeededRandom } from '../core/seeded-random-number-generator.js';
import { MatchPresentationDirector } from './match-presentation-director.js';
import { syncMatchMeshes } from './match-mesh-motion.js';
import {
  BALL_RADIUS, GOAL_LINE_X, GOAL_HALF_WIDTH, MAX_FLICK_SPEED, SIDE_HOME,
} from '../core/pitch-dimensions-and-constants.js';

const projected = new THREE.Vector3();

export class MatchSession {
  /**
   * @param ctx { renderer, scene, camera, canvas, cameraDirector, post, sound, hud }
   * @param options { level, homeTeam, awayTeam, controllers, homeDifficulty?, isAttract?, onEnd? }
   */
  constructor(ctx, options) {
    Object.assign(this, ctx);
    this.options = options;
    const level = (this.level = options.level);

    this.stage = buildLevelStage({ scene: ctx.scene, renderer: ctx.renderer, camera: ctx.camera,
      level, homeTeam: options.homeTeam, awayTeam: options.awayTeam });
    ctx.post.applyPreset(this.stage.preset);
    ctx.cameraDirector.setFogRange(this.stage.preset.fogRange);

    this.physics = new FlickPhysicsEngine({ frictionScale: level.frictionScale ?? 1 });
    this.entries = this.stage.caps.map((cap) => ({
      ...cap,
      body: this.physics.addBody({ x: cap.home[0], z: cap.home[1], radius: cap.radius, mass: 1, kind: 'cap', side: cap.side }),
    }));
    this.ballBody = this.physics.addBody({ x: 0, z: 0, radius: BALL_RADIUS, mass: 0.12, kind: 'ball' });
    for (const body of [...this.stage.postBodies, ...this.stage.obstacleBodies]) this.physics.addStaticCircle(body);

    this.rules = new MatchRules(level.rules, options.controllers);
    this.time = new GameTimeController();
    this.visuals = new AimVisuals(this.stage.group);
    this.juice = new JuiceAnimator(this.entries, this.stage.ballMesh, this.stage.goals);
    this.particles = new ImpactParticles(this.stage.group);
    Object.assign(this, { timers: [], paused: false, disposed: false, slowMoUsed: false, trailClock: 0, tutorialActive: false, tutorialDone: false });

    this.input = new HumanDragAimInput({
      camera: ctx.camera, domElement: ctx.canvas, visuals: this.visuals, juice: this.juice,
      canControl: (side) => !this.paused && !this.rules.isAi(side) && this.rules.canFlick(side),
      onFlick: (entry, velocity, gesture) => this.flick(entry, velocity, gesture),
      onAimStart: () => { this.hideTutorial(); this.sound.event?.('aimStart'); },
    });
    this.input.setEntries(this.entries);
    this.ai = new AiTurnPerformer({
      physics: this.physics, visuals: this.visuals, juice: this.juice,
      rng: createSeededRandom(Date.now() % 1e9), onFlick: (entry, velocity) => this.flick(entry, velocity),
    });
    this.presentation = new MatchPresentationDirector(this);
    wireMatchFeedback(this);
  }

  start() { this.rules.start(SIDE_HOME); }

  schedule(seconds, fn) { this.timers.push({ left: seconds, fn }); }

  entriesForSide(side) {
    return this.entries.filter((e) => e.side === side);
  }

  flick(entry, velocity, gesture = null) {
    if (!this.rules.registerFlick(entry.side)) return;
    this.presentation.begin(entry, velocity, gesture);
    entry.body.vel.copy(velocity);
    const power = velocity.length() / MAX_FLICK_SPEED;
    this.slowMoUsed = false;
    this.juice.release(entry, power);
    this.sound.flick(power);
    this.particles.dustPuff(entry.body.pos.x, entry.body.pos.y, 0.25 * power);
    this.cameraDirector.kick(velocity.x / MAX_FLICK_SPEED, velocity.y / MAX_FLICK_SPEED, 0.22 * power);
  }

  resetToKickoff() {
    for (const body of [...this.entries.map((e) => e.body), this.ballBody]) body.vel.set(0, 0);
    for (const e of this.entries) e.body.pos.set(e.home[0], e.home[1]);
    this.ballBody.pos.set(0, 0);
    this.physics.resetGoalCooldown();
    this.physics.accumulator = 0;
    this.juice.reset();
    this.particles.clearConfetti();
    this.time.reset();
  }

  showTutorial() {
    if (!this.tutorialDone) this.tutorialActive = true;
  }

  hideTutorial() {
    if (this.tutorialActive) this.tutorialDone = true;
    this.tutorialActive = false;
    this.hud.hideTutorial();
  }

  setPaused(paused) {
    this.paused = paused;
    this.sound.setPaused?.(paused);
    if (paused) this.input.cancel();
  }

  update(realDt, t) {
    if (this.paused || this.disposed) return;
    if (this.presentation.update(realDt)) return;
    this.runTimers(realDt);
    if (this.disposed || this.presentation.replay.active) return;

    const dt = this.time.step(realDt);
    this.physics.advance(dt);
    if (this.rules.phase === 'moving') {
      this.watchForDramaticShot();
      if (this.physics.allBodiesResting()) this.rules.resolvePlayAtRest();
    }
    syncMatchMeshes(this, dt);
    this.ai.update(realDt);
    this.juice.update(dt);
    this.presentation.capture(realDt);
    this.particles.update(dt);
    this.visuals.update(t);
    this.stage.backdrop.update(t, realDt);
    this.cameraDirector.setFocus(this.ballBody.pos.x, this.ballBody.pos.y, this.ballBody.vel);
    if (this.tutorialActive) this.positionTutorial();
  }

  runTimers(dt) {
    const due = [];
    this.timers = this.timers.filter((timer) => {
      timer.left -= dt;
      if (timer.left > 0) return true;
      due.push(timer.fn);
      return false;
    });
    for (const fn of due) if (!this.disposed) fn();
  }

  /** Slow the world down when a shot is about to reach the goal mouth. */
  watchForDramaticShot() {
    if (this.slowMoUsed || this.time.isSlowMotion) return;
    const { pos, vel } = this.ballBody;
    if (Math.abs(vel.x) < 0.5) return;
    const distToLine = Math.sign(vel.x) * GOAL_LINE_X - pos.x;
    if (Math.sign(distToLine) !== Math.sign(vel.x) || Math.abs(distToLine) > 0.45) return;
    const zAtLine = pos.y + vel.y * (Math.abs(distToLine) / Math.abs(vel.x));
    if (Math.abs(zAtLine) > GOAL_HALF_WIDTH + 0.03) return; // includes agonising near-misses
    this.slowMoUsed = true;
    this.time.slowMotion(0.28, 0.5);
    this.sound.slowMoWhoosh();
  }

  syncMeshes(dt) { syncMatchMeshes(this, dt); }

  positionTutorial() {
    const ball = this.ballBody.pos;
    const striker = this.entriesForSide(SIDE_HOME)
      .reduce((best, e) => (e.body.pos.distanceTo(ball) < best.body.pos.distanceTo(ball) ? e : best));
    projected.set(striker.body.pos.x, 0.02, striker.body.pos.y).project(this.camera);
    this.hud.showTutorial(((projected.x + 1) / 2) * window.innerWidth, ((1 - projected.y) / 2) * window.innerHeight);
  }

  dispose() {
    this.disposed = true;
    this.timers = [];
    this.ai.cancel();
    this.input.dispose();
    this.presentation.dispose();
    this.hud.hideTutorial();
    this.stage.dispose();
  }
}
