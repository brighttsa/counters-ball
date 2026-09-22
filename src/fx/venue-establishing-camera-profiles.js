// World-space openings reveal actual venue landmarks before the shared play view.
export const VENUE_OPENINGS = {
  schoolyard: { position: [-4.8, 3.8, 3.4], target: [-2.2, 0.1, -2.8] },
  kiosk: { position: [4.2, 1.5, 3.8], target: [0, 0.65, -3.8] },
  veranda: { position: [-5.2, 1.7, 1.6], target: [0.8, 0.15, -2.3] },
  roadside: { position: [5.5, 3.1, 1.4], target: [0, -0.2, -4] },
  harmattan: { position: [-3.7, 5.8, 1.8], target: [1, -0.15, -3.2] },
  night: { position: [3.4, 1.15, 3.6], target: [-1.1, 1, -3.5] },
};

export function applyVenueOpening(director, dt, motion) {
  const intro = director.intro;
  if (!intro) return;
  intro.t += dt;
  const p = Math.min(1, intro.t / intro.duration);
  const blend = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
  if (motion) {
    const profile = VENUE_OPENINGS[director.venue] ?? VENUE_OPENINGS.kiosk;
    director.tmp.fromArray(profile.position).multiplyScalar(Math.max(1, director.fitDistance / 4.5));
    director.pos.lerpVectors(director.tmp, director.pos, blend);
    director.tmp.fromArray(profile.target);
    director.look.lerpVectors(director.tmp, director.look, blend);
  }
  if (p >= 1) director.setMode('play');
}

export function applyReplayView(director) {
  const { pos, look, camera, replayDirection: direction, replayView: view } = director;
  look.copy(director.replayFocus);
  pos.set(look.x - direction * 1.25, view === 'GROUND CAM' ? 0.24 : 0.65,
    look.z + 2.2 / Math.min(1, camera.aspect));
  if (view === 'TOP CAM') {
    look.set(0, 0, 0);
    pos.set(0, director.fitDistance, 0.01);
  }
  if (view === 'HERO CAM') pos.set(-direction * 2.2, 0.42, 2.5 / Math.min(1, camera.aspect));
}
