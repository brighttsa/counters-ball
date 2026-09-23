# Player-Controlled Cameras

## Controls and Scope
- Camera button opens the shared Ink & Impact selector in every match mode.
- 1 Tactical, 2 Broadcast, 3 Street Level; C cycles those three presets.
- Free Camera uses Three r160 OrbitControls on a dedicated pad, never the pitch
  canvas. Drag/pinch/wheel, orbit/height buttons and a zoom slider are available.
- Hold Tactical peek (pointer or Space/Enter), release to return. Reset restores
  Broadcast and the safe orbit pose. Motion-off/reduced-motion skips interpolation.
- Preferences use a separate localStorage key, with independent home/away modes
  for hot-seat. Orbit positions are session-only and reset for a new venue.
- No online multiplayer exists. No network or authoritative gameplay state is
  introduced. Camera changes do not call flick, turn or mechanic methods.

## Safety
The existing ray-plane input remains unchanged: y=0, physics x/world x and
physics y/world z, a frozen camera per drag. Camera commands cancel a held
gesture with "Aim cancelled. No flick used." rather than reinterpret its pointer.
The old pointer release cannot fire. Aiming locks the camera until release.

Tactical and Broadcast fit a 4.5 by 2.9 envelope around goals and mechanics,
with HUD margins. Street Level frames the last selected cap (or active side's
first cap), ball and attacking goal at selection time. It is intentionally not
a full-pitch view. Free targets the pitch centre, constrains elevation and zoom,
and has no pan. External scenery intersecting sightlines is temporarily hidden;
playable objects and mechanic geometry are never hidden or moved by this guard.
The selected view takes precedence over goal/replay camera choreography; replay
playback itself is unchanged. Existing venue openings still run before kickoff.

## Verification
- 137 tests pass, zero skips with Three r160, including world-plane velocity
  equivalence across four poses, cancellation without shot, full-pitch framing
  at four phone aspects and desktop, malformed storage and scenery restoration.
- Port 4181: same-position Roadside Tactical/Broadcast/Street captures, with
  identical body positions/velocities and zero flicks used between selections.
- Prepared touch-style drag -> keyboard Tactical -> old pointer release:
  no bodies changed, no flick consumed. Embedded browser pointer automation
  gave unreliable coordinates, so repeated this check with focused controls.
- Classic two-player Schoolyard: all four modes at 320/375/390/430 widths have
  nonblank GPU samples. Free orbit button, zoom endpoint, reset and C cycle checked.
- Known unattributed MutationObserver diagnostic persists; no new shader errors.

Screenshots in
`/Users/bskt/.codex/visualizations/2026/09/17/01a0af33-a20d-7d71-915a-a1dcf0f3685e/`:
`camera-tactical.png`, `camera-broadcast.png`, `camera-street.png`.
These include the test harness, not marketing crops.

## Remaining Checks
Physical iOS/Android orbit/pinch and hold/release, sustained performance,
hot-seat preference handover through a complete match, opponent-turn/goal/replay
and restart stress are not fully browser-verified. Open Free controls overlay
part of the pitch; close the panel before aiming. Street framing stays fixed
until the next selection rather than chasing moving pieces. Occlusion uses
conservative bounding boxes, so an entire exterior mesh may disappear.
