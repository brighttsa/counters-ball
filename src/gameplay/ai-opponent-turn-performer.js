// Performs an AI turn so it reads like a person at the table: eyes scan the
// caps while it thinks, it picks one, pulls back with an ease-out draw,
// holds for a breath, then flicks. Planning runs across frames; stale plans
// are discarded via a turn token when the match restarts or quits.
import * as THREE from 'three';
import { planAiShot, AI_DIFFICULTY } from './ai-opponent-shot-planner.js';
import { MAX_FLICK_SPEED, MAX_PULL } from '../core/pitch-dimensions-and-constants.js';

const PULL_SECONDS = 0.75;
const HOLD_SECONDS = 0.18;
const SCAN_SECONDS = 0.38;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

export class AiTurnPerformer {
  constructor({ physics, visuals, juice, rng, onFlick }) {
    Object.assign(this, { physics, visuals, juice, rng, onFlick });
    this.token = 0;
    this.anim = null;
    this.thinking = null;
  }

  async takeTurn(side, entries, ballBody, difficultyKey) {
    const token = ++this.token;
    const difficulty = AI_DIFFICULTY[difficultyKey] ?? AI_DIFFICULTY.medium;
    const startedAt = performance.now();
    this.thinking = { entries, t: 0 };

    let plan = await planAiShot({
      physics: this.physics, side, capBodies: entries.map((e) => e.body), ballBody, difficulty,
      rng: this.rng, yieldToFrame: nextFrame, isCancelled: () => token !== this.token,
    });
    if (token !== this.token) return;
    await wait(difficulty.think * 1000 - (performance.now() - startedAt));
    if (token !== this.token) return;

    if (!plan) { // defensive fallback: poke the cap nearest the ball straight at it
      const body = entries.reduce((best, e) =>
        (e.body.pos.distanceTo(ballBody.pos) < best.body.pos.distanceTo(ballBody.pos) ? e : best)).body;
      plan = { body, velocity: ballBody.pos.clone().sub(body.pos).normalize().multiplyScalar(MAX_FLICK_SPEED * 0.6) };
    }
    this.thinking = null;
    this.visuals.hover(null);
    this.anim = {
      entry: entries.find((e) => e.body === plan.body),
      velocity: plan.velocity,
      finalPull: plan.velocity.clone().multiplyScalar(MAX_PULL / MAX_FLICK_SPEED),
      pull: new THREE.Vector2(),
      t: 0,
    };
  }

  update(dt) {
    if (this.thinking) {
      const th = this.thinking;
      th.t = Math.max(0, th.t + dt);
      this.visuals.hover(th.entries[Math.floor(th.t / SCAN_SECONDS) % th.entries.length].body);
    }
    const a = this.anim;
    if (!a?.entry) return;
    a.t += dt;
    a.pull.copy(a.finalPull).multiplyScalar(easeOutCubic(Math.min(1, a.t / PULL_SECONDS)));
    this.visuals.show(a.entry.body, a.pull);
    this.juice.press(a.entry, a.pull, a.pull.length() / MAX_PULL);
    if (a.t >= PULL_SECONDS + HOLD_SECONDS) {
      this.anim = null;
      this.visuals.hide();
      this.onFlick(a.entry, a.velocity);
    }
  }

  cancel() {
    this.token += 1;
    if (this.anim) this.juice.release(this.anim.entry, 0);
    this.anim = null;
    this.thinking = null;
    this.visuals.hide();
    this.visuals.hover(null);
  }
}
