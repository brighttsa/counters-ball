import * as THREE from 'three';
import { BALL_RADIUS } from '../core/pitch-dimensions-and-constants.js';

const rollAxis = new THREE.Vector3();

export function syncMatchMeshes(session, dt) {
  for (const entry of session.entries) {
    entry.pivot.position.x = entry.body.pos.x;
    entry.pivot.position.z = entry.body.pos.y;
    const speed = entry.body.vel.length();
    if (speed > 0.01) entry.mesh.rotation.y += speed * dt * 2.2;
  }
  const { pos, vel } = session.ballBody;
  const mesh = session.stage.ballMesh;
  mesh.position.x = pos.x;
  mesh.position.z = pos.y;
  const speed = vel.length();
  if (speed > 0.01 && dt > 0) {
    rollAxis.set(vel.y, 0, -vel.x).normalize();
    mesh.rotateOnWorldAxis(rollAxis, speed * dt / BALL_RADIUS);
    session.trailClock += dt;
    if (speed > 1.2 && session.trailClock > 0.045) {
      session.trailClock = 0;
      session.particles.trail(pos.x, pos.y, vel);
    }
  }
}
