// Spring-driven secondary animation — the difference between objects that
// move and objects that feel. Caps sink and lean back under the finger, snap
// and squash on release, wobble when struck; the paper ball hops on hard
// hits; matchstick goals shiver when the ball rattles the woodwork.
import { BALL_RADIUS } from '../core/pitch-dimensions-and-constants.js';

const spring = () => ({ x: 0, v: 0, target: 0 });

function stepSpring(s, stiffness, damping, dt) {
  s.v += (-stiffness * (s.x - s.target) - damping * s.v) * dt;
  s.x += s.v * dt;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class JuiceAnimator {
  constructor(capEntries, ballMesh, goals) {
    this.states = new Map(capEntries.map((e) => [e, { sink: spring(), leanX: spring(), leanZ: spring(), squash: spring() }]));
    this.ballMesh = ballMesh;
    this.ballHop = { y: 0, vy: 0 };
    this.ballCompression = spring();
    this.goals = goals;
    this.goalWobble = { [-1]: spring(), [1]: spring() };
  }

  /** While aiming: press the cap into the table and lean its top toward the finger. */
  press(entry, pull, power) {
    const s = this.states.get(entry);
    if (!s) return;
    const len = pull.length() || 1;
    s.sink.target = power;
    s.leanX.target = (-pull.x / len) * power;
    s.leanZ.target = (-pull.y / len) * power;
  }

  /** Release: springs return and the cap pops (squash → overshoot). */
  release(entry, power) {
    const s = this.states.get(entry);
    if (!s) return;
    s.sink.target = s.leanX.target = s.leanZ.target = 0;
    s.squash.v += 7 * power;
  }

  /** @param strength 0..1 contact strength; (dirX, dirZ) away from the contact */
  hitCap(entry, strength, dirX, dirZ) {
    const s = this.states.get(entry);
    if (!s) return;
    s.squash.v += strength * 5;
    s.leanX.v += dirX * strength * 7;
    s.leanZ.v += dirZ * strength * 7;
  }

  hopBall(strength) {
    this.ballHop.vy = Math.max(this.ballHop.vy, strength * 1.3);
    this.ballCompression.v += strength * 3;
  }

  wobbleGoal(sign, strength) {
    const wobble = this.goalWobble[sign];
    if (wobble) wobble.v -= sign * strength * 8; // knocked back, away from the pitch
  }

  reset() {
    for (const s of this.states.values()) Object.values(s).forEach((sp) => Object.assign(sp, spring()));
    Object.values(this.goalWobble).forEach((sp) => Object.assign(sp, spring()));
    this.ballHop.y = this.ballHop.vy = 0;
    Object.assign(this.ballCompression, spring());
    this.ballMesh.scale.setScalar(1);
  }

  update(dt) {
    if (dt <= 0) return; // frozen during hit-stop, like everything else
    const h = Math.min(dt, 1 / 30);

    for (const [entry, s] of this.states) {
      stepSpring(s.sink, 260, 24, h);
      stepSpring(s.leanX, 170, 11, h);
      stepSpring(s.leanZ, 170, 11, h);
      stepSpring(s.squash, 320, 9, h);
      const pivot = entry.pivot;
      const vx = clamp(entry.body.vel.x * 0.009, -0.025, 0.025);
      const vz = clamp(entry.body.vel.y * 0.009, -0.025, 0.025);
      const squash = clamp(s.squash.x, -0.3, 0.45);
      pivot.position.y = -s.sink.x * 0.004;
      pivot.rotation.z = -clamp(s.leanX.x, -1.4, 1.4) * 0.2 + vx;
      pivot.rotation.x = clamp(s.leanZ.x, -1.4, 1.4) * 0.2 - vz;
      pivot.scale.set(1 + squash * 0.18, 1 - squash * 0.45 - s.sink.x * 0.12, 1 + squash * 0.18);
    }

    const hop = this.ballHop;
    if (hop.y > 0 || hop.vy > 0) {
      hop.vy -= 9 * h;
      hop.y += hop.vy * h;
      if (hop.y < 0) {
        hop.y = 0;
        hop.vy = -hop.vy * 0.35;
        if (hop.vy < 0.12) hop.vy = 0;
      }
    }
    this.ballMesh.position.y = BALL_RADIUS * 0.92 + hop.y;
    stepSpring(this.ballCompression, 300, 18, h);
    const compression = clamp(this.ballCompression.x, -0.06, 0.12);
    this.ballMesh.scale.set(1 + compression, 1 - compression, 1 + compression);

    for (const sign of [-1, 1]) {
      stepSpring(this.goalWobble[sign], 140, 5, h);
      this.goals[sign].rotation.z = clamp(this.goalWobble[sign].x, -2, 2) * 0.1;
    }
  }
}
