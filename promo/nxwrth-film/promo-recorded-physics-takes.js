// A "take" is one flick (or a few) played through the game's real physics and
// recorded to arrays, then sampled at any time. That makes every shot a pure
// function of film time: scrubbing, pausing and frame-by-frame export all show
// exactly the same motion, and impacts are known in advance for sound and shake.
import * as THREE from 'three';
import { FlickPhysicsEngine, FIXED_STEP } from '../../src/gameplay/flick-physics-engine.js';
import { BALL_RADIUS, MAX_FLICK_SPEED } from '../../src/core/pitch-dimensions-and-constants.js';

const SAMPLE_EVERY = 2;                       // physics steps per stored sample (120 Hz)
const SAMPLE_DT = FIXED_STEP * SAMPLE_EVERY;
const SPIN_PER_UNIT = 2.2;                    // radians a sliding cap turns per world unit, as in the game
const RESTITUTION_FACTOR = 1.8;
const OFFSTAGE = 40;

/**
 * @param stage a built level stage
 * @param spec { caps: { [capIndex]: [x, z] }, ball: [x, z] | null, duration,
 *   flicks: [{ t, cap, v: [vx, vz] } | { t, cap, at: capIndex | 'ball', speed }] } (`at` aims where the target is at that moment)
 * @returns { duration, events, apply(seconds), firstEvent(kind) }
 */
export function recordTake(stage, spec) {
  const physics = new FlickPhysicsEngine({ frictionScale: stage.level.frictionScale ?? 1 });
  const cast = Object.entries(spec.caps).map(([index, [x, z]]) => {
    const cap = stage.caps[Number(index)];
    return { index: Number(index), cap, body: physics.addBody({ x, z, radius: cap.radius, mass: 1, kind: 'cap', side: cap.side }) };
  });
  const onStage = new Set(cast.map((entry) => entry.cap));
  const ballBody = spec.ball
    ? physics.addBody({ x: spec.ball[0], z: spec.ball[1], radius: BALL_RADIUS, mass: 0.12, kind: 'ball' }) : null;
  for (const body of [...stage.postBodies, ...stage.obstacleBodies]) physics.addStaticCircle(body);

  const events = [];
  let now = 0;
  const strengthOf = (impulse, a, b) => Math.min(1, (impulse * (a.invMass + (b?.invMass ?? 0))) / (RESTITUTION_FACTOR * MAX_FLICK_SPEED));
  physics.onImpact = (a, b, impulse, x, z) => {
    const kinds = [a.kind, b.kind];
    const kind = kinds.includes('post') ? 'post' : kinds.includes('ball') ? 'ball' : 'cap';
    events.push({ t: now, kind, x, z, strength: strengthOf(impulse, a, b) });
  };
  physics.onWallHit = (body, impulse, x, z) => events.push({ t: now, kind: 'wall', x, z, strength: strengthOf(impulse, body) });
  physics.onGoalScored = (sign) => events.push({ t: now, kind: 'goal', x: sign * 1.5, z: ballBody.pos.y, strength: 1, sign });

  const samples = Math.ceil(spec.duration / SAMPLE_DT) + 1;
  const stride = cast.length * 3 + 6;
  const track = new Float32Array(samples * stride);
  const spins = cast.map(() => 0);
  const ballTurn = new THREE.Quaternion(), step = new THREE.Quaternion(), axis = new THREE.Vector3();
  const flicks = [...(spec.flicks ?? [])].sort((a, b) => a.t - b.t);

  for (let s = 0; s < samples; s++) {
    const row = s * stride;
    cast.forEach((entry, i) => track.set([entry.body.pos.x, entry.body.pos.y, spins[i]], row + i * 3));
    if (ballBody) track.set([ballBody.pos.x, ballBody.pos.y, ballTurn.x, ballTurn.y, ballTurn.z, ballTurn.w], row + cast.length * 3);
    for (let k = 0; k < SAMPLE_EVERY; k++) {
      while (flicks.length && flicks[0].t <= now) {
        const flick = flicks.shift();
        const body = cast.find((entry) => entry.index === flick.cap).body;
        if (flick.v) body.vel.set(flick.v[0], flick.v[1]);
        else {
          const target = flick.at === 'ball' ? ballBody : cast.find((entry) => entry.index === flick.at).body;
          body.vel.subVectors(target.pos, body.pos).setLength(flick.speed);
        }
        events.push({ t: now, kind: 'flick', x: body.pos.x, z: body.pos.y, strength: Math.min(1, body.vel.length() / MAX_FLICK_SPEED) });
      }
      physics.stepFixed(FIXED_STEP);
      now += FIXED_STEP;
      cast.forEach((entry, i) => { spins[i] += entry.body.vel.length() * FIXED_STEP * SPIN_PER_UNIT; });
      if (ballBody) {
        const speed = ballBody.vel.length();
        if (speed > 0.01) {
          axis.set(ballBody.vel.y, 0, -ballBody.vel.x).normalize();
          ballTurn.premultiply(step.setFromAxisAngle(axis, (speed * FIXED_STEP) / BALL_RADIUS));
        }
      }
    }
  }

  const a = new THREE.Quaternion(), b = new THREE.Quaternion();
  return {
    duration: spec.duration,
    events,
    firstEvent: (kind) => events.find((event) => event.kind === kind),

    /** Poses the stage's caps and ball as they were `seconds` into the take. */
    apply(seconds) {
      const at = THREE.MathUtils.clamp(seconds / SAMPLE_DT, 0, samples - 1);
      const s0 = Math.floor(at), s1 = Math.min(samples - 1, s0 + 1), f = at - s0;
      const r0 = s0 * stride, r1 = s1 * stride;
      const mix = (offset) => track[r0 + offset] + (track[r1 + offset] - track[r0 + offset]) * f;
      for (const cap of stage.caps) {
        if (onStage.has(cap)) continue;
        cap.pivot.position.set(OFFSTAGE, 0, OFFSTAGE);
        cap.pivot.visible = false;
      }
      cast.forEach(({ cap }, i) => {
        cap.pivot.visible = true;
        cap.pivot.position.set(mix(i * 3), 0, mix(i * 3 + 1));
        cap.pivot.rotation.set(0, 0, 0);
        cap.mesh.rotation.y = cap.baseSpin + mix(i * 3 + 2);
      });
      stage.ballMesh.visible = Boolean(ballBody);
      if (ballBody) {
        const o = cast.length * 3;
        stage.ballMesh.position.set(mix(o), BALL_RADIUS, mix(o + 1));
        a.fromArray(track, r0 + o + 2); b.fromArray(track, r1 + o + 2);
        stage.ballMesh.quaternion.copy(a.slerp(b, f));
      }
    },
  };
}
