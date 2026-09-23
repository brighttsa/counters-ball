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

// How far down the screen the scoreboard and its objective line really reach. The objective runs to
// two or three lines on some Street Legends acts, deeper than the fixed reserve.
function measuredHudBottom() {
  if (typeof document === 'undefined') return 0;
  return Math.max(0, ...['.scoreboard', '#hud-objective'].map(selector => {
    const box = document.querySelector(selector)?.getBoundingClientRect();
    return box?.height ? box.bottom : 0;
  }));
}

function viewBounds(top, bottom) {
  const viewport = typeof window !== 'undefined' ? window : null;
  if (!viewport?.innerHeight) return { x: .95, top: .62, bottom: -.76 };
  const { innerWidth: width, innerHeight: height } = viewport;
  const reserve = hudReservePixels(width, height);
  const topPx = top ?? Math.max(reserve.top, measuredHudBottom() + 8), bottomPx = bottom?.(reserve) ?? reserve.bottom;
  return { x: .95, top: Math.max(.15, 1 - 2 * topPx / height), bottom: -Math.max(.15, 1 - 2 * bottomPx / height) };
}

// Broadcast is a TV-style side-on view fitted as tight as the screen allows around both goals (the
// lorries that carry them on lorry acts) and the table's full width, between the scoreboard and the
// bottom controls. The table fills the frame; the rail ends behind the goals and the room around them
// are left out. It uses the lowest angle (from about 27°) at which the table also fills the screen's
// height: wide screens get the low TV angle, squarer ones a steeper view instead of empty room above and
// below. In portrait the goals sit top and bottom. Tactical and Free keep the whole-table view.
const BROADCAST_HEIGHTS = [1.45, 1.8, 2.2, 2.7]; // camera rise per 2.8 back: about 27°, 33°, 38°, 44°
const BROADCAST_FILL = .8; // share of the screen height between the HUD bars the table should cover

export function broadcastPose(camera, session) {
  const portrait = camera.aspect < .95;
  const lorry = session?.level?.mechanic?.type === 'departing-lorry';
  const goalX = lorry ? 1.9 : 1.5, goalTop = .26;
  const goals = [-goalX, goalX].flatMap(x => [-.3, .3].flatMap(z => [0, goalTop].map(y => new THREE.Vector3(x, y, z))));
  // The table's full width, outer rail to outer rail, across the middle.
  const width = [-.1, .1].flatMap(x => [-1.2, 1.2].flatMap(z => [0, .05].map(y => new THREE.Vector3(x, y, z))));
  // The bottom chips sit in the corners, so the near rail may run much closer to the bottom edge.
  const bounds = viewBounds(undefined, r => Math.min(r.bottom, 60));
  const fit = direction => centredPitchPose(camera, direction, [...goals, ...width], bounds, 1);
  if (portrait) return fit(new THREE.Vector3(-1.4, 3.8, 0));
  const probe = camera.clone();
  probe.fov = 42; probe.updateProjectionMatrix();
  let best = null;
  for (const rise of BROADCAST_HEIGHTS) {
    const pose = fit(new THREE.Vector3(0, rise, 2.8));
    probe.position.copy(pose.position); probe.lookAt(pose.target); probe.updateMatrixWorld(true);
    const ys = width.map(point => point.clone().project(probe).y);
    const fill = (Math.max(...ys) - Math.min(...ys)) / (bounds.top - bounds.bottom);
    if (fill >= BROADCAST_FILL) return pose;
    if (!best || fill > best.fill) best = { pose, fill };
  }
  return best.pose;
}

/** The whole pitch at once, from the Broadcast side; Free camera orbits at this distance. */
export function overviewPose(camera, session) {
  const direction = camera.aspect < .95 ? new THREE.Vector3(-1.4, 3.8, 0) : new THREE.Vector3(0, 2, 2.8);
  return centredPitchPose(camera, direction, pitchFramePoints(session), viewBounds());
}

/** @param viewer the side the view belongs to: the human in a match against the computer, the side to play in 2-Player */
const STREET_LOOK_AHEAD = 1; // table units of the shot's path framed beyond the ball

export function playerCameraPose(camera, mode, session, selected, viewer = session?.rules?.turn) {
  const portrait = camera.aspect < .95;
  if (mode === 'broadcast') return broadcastPose(camera, session);
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
    // Street is the shot itself, from low behind the cap (about 27° in landscape): the cap with its whole
    // rim, the ball, and the way on toward the goal mouth, up to STREET_LOOK_AHEAD past the ball, kept
    // clear of the scoreboard and the bottom controls. Nothing behind the cap is framed and a distant goal
    // is not forced in, so the camera comes in close instead of backing off to fit the whole table.
    const rim = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dz]) => origin.clone().add(new THREE.Vector3(dx * .1, 0, dz * .1)));
    const mouth = [-.26, .26].flatMap(dz => [0, .24].map(y => goal.clone().setX(side * 1.5).add(new THREE.Vector3(0, y, dz))))
      .map(post => (post.distanceTo(ball) > STREET_LOOK_AHEAD ? ball.clone().add(post.sub(ball).setLength(STREET_LOOK_AHEAD)) : post));
    // On lorry acts the goal rides a lorry that changes stop between turns, so the lorry's side boards
    // (the scoring mouth) are always framed, however far away, or the player can't see what to aim at.
    if (session.level?.mechanic?.type === 'departing-lorry') {
      mouth.push(...[-.3, .3].flatMap(dz => [0, .26].map(y => goal.clone().setX(side * 1.785).add(new THREE.Vector3(0, y, dz)))));
    }
    return fitCameraPose(camera, target, new THREE.Vector3(-side, portrait ? .8 : .55, .28),
      [...rim, ball, ...mouth], 1.2, viewBounds(undefined, r => Math.min(r.bottom, 60)));
  }
  if (mode !== 'tactical') return overviewPose(camera, session);
  // Tactical looks down on the whole table, tipped a few degrees toward the player so the view keeps a
  // screen "up". Every view keeps its sideways offset at zero: any small sideways component rolls or
  // skews the table on screen, and the rails stop running square to the screen edges.
  const direction = portrait ? new THREE.Vector3(-.09, 1, 0) : new THREE.Vector3(0, 1, .09);
  return centredPitchPose(camera, direction, pitchFramePoints(session), viewBounds());
}
