import * as THREE from 'three';

export const CAMERA_MODES = ['tactical', 'broadcast', 'street', 'free'];
export const CAMERA_PREFERENCE_KEY = 'counters-ball-camera-v1';
export function loadCameraPreferences(storage) {
  try {
    const saved = JSON.parse(storage.getItem(CAMERA_PREFERENCE_KEY));
    return Object.fromEntries(['home', 'away'].map(side => [side,
      CAMERA_MODES.includes(saved?.[side]) ? saved[side] : 'broadcast']));
  } catch { return { home: 'broadcast', away: 'broadcast' }; }
}

const corners = [-2.25, 2.25].flatMap(x => [-1.45, 1.45].map(z => new THREE.Vector3(x, 0, z)));

export function fitCameraPose(camera, target, direction, points = corners, minimum = 3.2) {
  const probe = camera.clone();
  probe.fov = 42; probe.updateProjectionMatrix();
  const dir = direction.clone().normalize();
  let distance = minimum;
  for (let i = 0; i < 90; i++, distance *= 1.045) {
    probe.position.copy(target).addScaledVector(dir, distance);
    probe.lookAt(target); probe.updateMatrixWorld(true);
    if (points.every(point => {
      const p = point.clone().project(probe);
      return Math.abs(p.x) < .88 && p.y < .62 && p.y > -.76 && p.z < 1;
    })) break;
  }
  return { position: target.clone().addScaledVector(dir, distance), target: target.clone() };
}

export function playerCameraPose(camera, mode, session, selected) {
  const portrait = camera.aspect < .95;
  if (mode === 'street') {
    const side = session.rules.turn === 'away' ? -1 : 1;
    const cap = selected?.body.pos ?? session.entries.find(e => e.side === session.rules.turn)?.body.pos;
    const ball = new THREE.Vector3(session.ballBody.pos.x, 0, session.ballBody.pos.y);
    const goal = new THREE.Vector3(side * 1.7, 0, session.physics.goalCenters?.[side] ?? 0);
    const origin = new THREE.Vector3(cap?.x ?? -side, 0, cap?.y ?? 0);
    const target = ball.clone().lerp(goal, .25).lerp(origin, .25);
    return fitCameraPose(camera, target, new THREE.Vector3(-side, .3, .4), [origin, ball, goal], 3.1);
  }
  const direction = mode === 'tactical' ? new THREE.Vector3(.01, 1, .09)
    : new THREE.Vector3(.35, 2.62, 2.8);
  if (portrait) direction.set(-direction.z, direction.y, direction.x);
  return fitCameraPose(camera, new THREE.Vector3(0, 0, 0), direction);
}
