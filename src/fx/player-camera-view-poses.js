import * as THREE from 'three';

export const CAMERA_MODES = ['tactical', 'broadcast', 'street', 'free'];
export const CAMERA_PREFERENCE_KEY = 'counters-ball-camera-v1';
// Camera moves the player asks for (a mode button, a peek) land almost at once; moves the game makes on
// its own (a new turn, the end of a replay) glide over about a second so the view never whips around.
export const CAMERA_SNAP_RATE = 16;
export const CAMERA_GLIDE_RATE = 3;
export function cameraTransitionBlend(elapsed, motionEnabled, rate = CAMERA_SNAP_RATE) {
  return motionEnabled ? 1 - Math.exp(-Math.max(0, elapsed) * rate) : 1;
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
function centredPitchPose(camera, direction, points, bounds, minimum = 2.6) {
  const target = new THREE.Vector3();
  const up = new THREE.Vector3(-direction.x, 0, -direction.z).normalize(); // screen-up, on the table
  const probe = camera.clone();
  probe.fov = 42; probe.updateProjectionMatrix();
  let pose;
  for (let i = 0; i < 12; i++) {
    pose = fitCameraPose(camera, target, direction, points, minimum, bounds);
    probe.position.copy(pose.position); probe.lookAt(pose.target); probe.updateMatrixWorld(true);
    const ys = points.map(point => point.clone().project(probe).y);
    const room = ((bounds.top - Math.max(...ys)) - (Math.min(...ys) - bounds.bottom)) / 2;
    if (Math.abs(room) < .005) break;
    const distance = pose.position.distanceTo(target);
    target.addScaledVector(up, -room * distance * Math.tan(THREE.MathUtils.degToRad(21)));
  }
  return pose;
}

function viewBounds(top, bottom) {
  const viewport = typeof window !== 'undefined' ? window : null;
  if (!viewport?.innerHeight) return { x: .95, top: .62, bottom: -.76 };
  const { innerWidth: width, innerHeight: height } = viewport;
  const reserve = hudReservePixels(width, height);
  const topPx = top ?? reserve.top, bottomPx = bottom?.(reserve) ?? reserve.bottom;
  return { x: .95, top: Math.max(.15, 1 - 2 * topPx / height), bottom: -Math.max(.15, 1 - 2 * bottomPx / height) };
}

// Broadcast works like a TV football camera: side-on and low, zoomed in until the table's full width
// fills the screen from just under the scoreboard to the bottom controls, then sliding along the table
// to keep the ball centred and stopping at the goal ends. The table fills the frame; the room is only a
// thin band behind the far rail. In portrait the width spans the screen and the view slides along the
// length the same way. Tactical and Free keep the whole-table view.
export function broadcastFrame(camera, session) {
  const portrait = camera.aspect < .95;
  const direction = portrait ? new THREE.Vector3(-1.4, 3.8, .08) : new THREE.Vector3(.15, 1.45, 2.8);
  const lorry = session?.level?.mechanic?.type === 'departing-lorry';
  // The bottom chips sit in the corners, so the near rail may run much closer to the bottom edge.
  const bounds = viewBounds(undefined, r => Math.min(r.bottom, 60));
  // A thin slice across the table's full width (outer rail to outer rail), fitted and centred.
  const slice = [-.1, .1].flatMap(x => [-1.2, 1.2].flatMap(z => [0, .05].map(y => new THREE.Vector3(x, y, z))));
  const pose = centredPitchPose(camera, direction, slice, bounds, 1);
  const target = pose.target.clone(), offset = pose.position.clone().sub(target);
  // How far along the table the view reaches either side of the aim point, on the line through it.
  const probe = camera.clone();
  probe.fov = 42; probe.updateProjectionMatrix();
  probe.position.copy(pose.position); probe.lookAt(target); probe.updateMatrixWorld(true);
  const seen = [];
  for (let x = -4; x <= 4; x += .02) {
    const p = new THREE.Vector3(x, 0, target.z).project(probe);
    if (Math.abs(p.x) <= 1 && p.y <= bounds.top && p.y >= bounds.bottom && p.z < 1) seen.push(x);
  }
  const ahead = Math.max(...seen) - target.x, behind = target.x - Math.min(...seen);
  const end = lorry ? 2.2 : 1.8; // rail end plus a sliver of table, or the lorries behind the goals
  return { offset, target, x: [-end + behind, end - ahead] };
}

/** The Broadcast pose slid along the table to follow the ball, stopping at the ends. */
export function followBallPose(frame, x) {
  const [min, max] = frame.x;
  const target = frame.target.clone();
  // When the view is longer than the table, centre the table instead of following.
  target.x = min > max ? (min + max) / 2 : THREE.MathUtils.clamp(x, min, max);
  return { position: target.clone().add(frame.offset), target };
}

/** The whole pitch at once, from the Broadcast side; Free camera orbits at this distance. */
export function overviewPose(camera, session) {
  const direction = camera.aspect < .95 ? new THREE.Vector3(-1.4, 3.8, .08) : new THREE.Vector3(.3, 2, 2.8);
  return centredPitchPose(camera, direction, pitchFramePoints(session), viewBounds());
}

/** @param viewer the side the view belongs to: the human in a match against the computer, the side to play in 2-Player */
export function playerCameraPose(camera, mode, session, selected, viewer = session?.rules?.turn) {
  const portrait = camera.aspect < .95;
  if (mode === 'broadcast') return followBallPose(broadcastFrame(camera, session), session?.ballBody?.pos.x ?? 0);
  if (mode === 'street') {
    const side = viewer === 'away' ? -1 : 1;
    const candidates = session.entries.filter(e => e.side === viewer);
    const nearest = candidates.reduce((best, e) => !best || e.body.pos.distanceTo(session.ballBody.pos)
      < best.body.pos.distanceTo(session.ballBody.pos) ? e : best, null);
    const cap = (selected?.side === viewer ? selected : nearest)?.body.pos;
    const ball = new THREE.Vector3(session.ballBody.pos.x, 0, session.ballBody.pos.y);
    const goal = new THREE.Vector3(side * 1.7, 0, session.physics.goalCenters?.[side] ?? 0);
    const origin = new THREE.Vector3(cap?.x ?? -side, 0, cap?.y ?? 0);
    const target = ball.clone().lerp(origin, .46);
    const near = [-1.05, 1.05].map(z => new THREE.Vector3(-side * 1.5, 0, z));
    return fitCameraPose(camera, target, new THREE.Vector3(-side, portrait ? 1.15 : .9, .28),
      [...near, origin, ball, goal], 2.8, { x: .9, top: .8, bottom: -.82 });
  }
  if (mode !== 'tactical') return overviewPose(camera, session);
  // Tactical looks straight down on the whole pitch.
  const direction = portrait ? new THREE.Vector3(-.09, 1, .01) : new THREE.Vector3(.01, 1, .09);
  return centredPitchPose(camera, direction, pitchFramePoints(session), viewBounds());
}
