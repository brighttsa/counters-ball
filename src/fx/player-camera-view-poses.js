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

export function fitCameraPose(camera, target, direction, points = corners, minimum = 3.2, bounds = { x: .88, top: .62, bottom: -.76 }) {
  const probe = camera.clone();
  probe.fov = 42; probe.updateProjectionMatrix();
  const dir = direction.clone().normalize();
  const fits = distance => {
    probe.position.copy(target).addScaledVector(dir, distance);
    probe.lookAt(target); probe.updateMatrixWorld(true);
    return points.every(point => {
      const p = point.clone().project(probe);
      return Math.abs(p.x) < bounds.x && p.y < bounds.top && p.y > bounds.bottom && p.z < 1;
    });
  };
  let distance = minimum, lower = minimum;
  while (!fits(distance) && distance < 100) { lower = distance; distance *= 1.2; }
  for (let i = 0; i < 16 && distance > minimum; i++) {
    const middle = (lower + distance) / 2;
    if (fits(middle)) distance = middle; else lower = middle;
  }
  return { position: target.clone().addScaledVector(dir, distance), target: target.clone() };
}

export function playerCameraPose(camera, mode, session, selected) {
  const portrait = camera.aspect < .95;
  if (mode === 'street') {
    const side = session.rules.turn === 'away' ? -1 : 1;
    const candidates = session.entries.filter(e => e.side === session.rules.turn);
    const nearest = candidates.reduce((best, e) => !best || e.body.pos.distanceTo(session.ballBody.pos)
      < best.body.pos.distanceTo(session.ballBody.pos) ? e : best, null);
    const cap = (selected?.side === session.rules.turn ? selected : nearest)?.body.pos;
    const ball = new THREE.Vector3(session.ballBody.pos.x, 0, session.ballBody.pos.y);
    const goal = new THREE.Vector3(side * 1.7, 0, session.physics.goalCenters?.[side] ?? 0);
    const origin = new THREE.Vector3(cap?.x ?? -side, 0, cap?.y ?? 0);
    const target = ball.clone().lerp(origin, .46);
    const near = [-1.05, 1.05].map(z => new THREE.Vector3(-side * 1.5, 0, z));
    return fitCameraPose(camera, target, new THREE.Vector3(-side, portrait ? 1.15 : .9, .28),
      [...near, origin, ball, goal], 2.8, { x: .9, top: .8, bottom: -.82 });
  }
  const direction = mode === 'tactical' ? new THREE.Vector3(.01, 1, .09)
    : new THREE.Vector3(.35, 2.62, 2.8);
  if (portrait) {
    direction.set(-direction.z, direction.y, direction.x);
    if (mode !== 'tactical') direction.set(-1.4, 3.8, .08);
  }
  const viewport = typeof window !== 'undefined' ? window : null;
  if (viewport?.innerWidth <= 1100 || viewport?.matchMedia?.('(pointer: coarse)').matches) {
    // Fit the rails and complete goal structures, not the decorative tabletop apron.
    const end = session.level?.mechanic?.type === 'departing-lorry' ? 2.08 : 1.94;
    const play = [-end, end].flatMap(x => [-1.24, 1.24].flatMap(z =>
      [0, .28].map(y => new THREE.Vector3(x, y, z))));
    const height = viewport.innerHeight;
    const top = portrait || height > 600 ? 136 : 80;
    const bottom = portrait || height > 600 ? 144 : 72;
    return fitCameraPose(camera, new THREE.Vector3(), direction, play, 2.6,
      { x: .90, top: Math.max(.15, 1 - 2 * top / height), bottom: -Math.max(.15, 1 - 2 * bottom / height) });
  }
  return fitCameraPose(camera, new THREE.Vector3(0, 0, 0), direction);
}
