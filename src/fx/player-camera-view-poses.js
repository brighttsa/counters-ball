import * as THREE from 'three';

export const CAMERA_MODES = ['tactical', 'broadcast', 'street', 'free'];
export const CAMERA_PREFERENCE_KEY = 'counters-ball-camera-v1';
export function cameraTransitionBlend(elapsed, motionEnabled) {
  return motionEnabled ? 1 - Math.exp(-Math.max(0, elapsed) * 16) : 1;
}
export function loadCameraPreferences(storage) {
  try {
    const saved = JSON.parse(storage.getItem(CAMERA_PREFERENCE_KEY));
    return Object.fromEntries(['home', 'away'].map(side => [side,
      CAMERA_MODES.includes(saved?.[side]) ? saved[side] : 'broadcast']));
  } catch { return { home: 'broadcast', away: 'broadcast' }; }
}

// The match is framed on the pitch, not the table or the room: the outer edge and top of the
// rail battens plus the matchstick crossbars. Lorry acts add the toy lorries that carry each
// goal along the table ends, behind the battens.
export function pitchFramePoints(session) {
  const lorry = session?.level?.mechanic?.type === 'departing-lorry';
  const x = lorry ? 2.08 : 1.72, z = 1.2;
  const rails = [-x, x].flatMap(px => [-z, z].flatMap(pz =>
    [0, lorry ? .22 : .05].map(y => new THREE.Vector3(px, y, pz))));
  const crossbars = [-1.5, 1.5].flatMap(px => [-.3, .3].map(pz => new THREE.Vector3(px, .26, pz)));
  return [...rails, ...crossbars];
}

// Screen space kept clear for the scoreboard and its callout (top) and the flick/camera chips (bottom).
export function hudReservePixels(width, height) {
  const roomy = width / height < .95 || height > 600;
  return { top: roomy ? 136 : 80, bottom: roomy ? 144 : 72 };
}

export function fitCameraPose(camera, target, direction, points = pitchFramePoints(), minimum = 3.2, bounds = { x: .95, top: .62, bottom: -.76 }) {
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

// Fits the pitch, then slides the aim point along the table until the space left above and below
// the pitch is equal, and refits: without this the far rail sits well below the scoreboard and
// the whole view could come closer.
function centredPitchPose(camera, direction, points, bounds) {
  const target = new THREE.Vector3();
  const up = new THREE.Vector3(-direction.x, 0, -direction.z).normalize(); // screen-up, on the table
  const probe = camera.clone();
  probe.fov = 42; probe.updateProjectionMatrix();
  let pose;
  for (let i = 0; i < 6; i++) {
    pose = fitCameraPose(camera, target, direction, points, 2.6, bounds);
    probe.position.copy(pose.position); probe.lookAt(pose.target); probe.updateMatrixWorld(true);
    const ys = points.map(point => point.clone().project(probe).y);
    const room = ((bounds.top - Math.max(...ys)) - (Math.min(...ys) - bounds.bottom)) / 2;
    if (Math.abs(room) < .005) break;
    const distance = pose.position.distanceTo(target);
    target.addScaledVector(up, -room * distance * Math.tan(THREE.MathUtils.degToRad(21)));
  }
  return pose;
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
  // Broadcast sits pitch-side at about 35° so the table fills the screen; Tactical looks straight down.
  const direction = mode === 'tactical' ? new THREE.Vector3(.01, 1, .09)
    : new THREE.Vector3(.3, 2, 2.8);
  if (portrait) {
    direction.set(-direction.z, direction.y, direction.x);
    if (mode !== 'tactical') direction.set(-1.4, 3.8, .08);
  }
  const points = pitchFramePoints(session);
  const viewport = typeof window !== 'undefined' ? window : null;
  if (!viewport?.innerHeight) return centredPitchPose(camera, direction, points, { x: .95, top: .62, bottom: -.76 });
  const { innerWidth: width, innerHeight: height } = viewport;
  const { top, bottom } = hudReservePixels(width, height);
  return centredPitchPose(camera, direction, points,
    { x: .95, top: Math.max(.15, 1 - 2 * top / height), bottom: -Math.max(.15, 1 - 2 * bottom / height) });
}
