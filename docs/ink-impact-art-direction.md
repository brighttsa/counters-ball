# Ink and Impact: Whole Game

## Scope
The owner approved the whole-game rollout on September 23. Every venue and
mode now uses the shared treatment, including all 18 Street Legends acts,
Classic Campaign, two-player and attract/preview sessions.
No physics, difficulty, collision geometry, save identifiers or unlock rules changed.
No deployment. Roadside remains the featured home composition, not the only ink venue.

## Art Direction
- Ink #101514, paper #f5f1df, signal yellow #f0cf45. Red caps and ivory rivals
  retain team identity. Green/amber/red continue to mean real toll states.
- Original seeded canvas cap illustration: scalloped metal, star enamel, chipped
  print, halftone shading and directional scrape. No reference artwork copied.
- Home uses the implemented Tema table and toll canopy in a dedicated attract
  composition. Play Roadside enters the real first act; all 18 acts, Classic and
  local two-player remain accessible. No online mode is implied.
- Selective contours on up to 96 opaque scene meshes, prioritized by size, plus
  the ball and one ground silhouette per cap. No full-screen edge-detection pass.
- Five-band luminance quantization mixed at 65%, normal-based ink rims and sparse
  shadow halftone dots preserve texture hues. Each venue keeps its existing
  lighting temperature, fog and local practical lights, including Jamestown's bulb.
- Paired service booths, window ledges, lamps, repaired kerbs and drainage strips
  reinforce the junction in depth. Static meshes are merged by material.
- Compact ink scoreboard and objective at the top; turn ownership at the bottom.
  Goals use the actual score, venue and mechanic label in the existing timed lane.
- Strong contacts/release produce a bounded pool of angular ground strokes for
  180 ms. Below .28 strength they do not fire. Reduced motion suppresses them;
  the session clock freezes them on pause. Existing broad Flick Vector is retained.

## Verification
- Whole-game rollout: 132 tests pass with real Three r160. All six Street Legends
  Act 1 scenes captured without HUD at 1280px; all six checked with aim at each
  of 320/375/390/430px. Nonblank GPU samples in every check. All six Classic
  two-player scenes also render; real planned Schoolyard flick enters moving.
- Shared pause screen verified. The prior MutationObserver diagnostic remains;
  no shader compilation or missing-module errors observed. Physical devices,
  sustained performance and a full win/replay in every venue remain unverified.
- Rollout captures: `ink-all-<venue>-desktop.png` and `ink-all-<venue>-<width>.png`
  in the evidence directory below. These are iframe harness captures, not device emulation.

### Original Roadside Slice Evidence
- 129 tests passed, zero failures or skips with real Three.js r160.
- Desktop home, opening and gameplay rendered on port 4181.
- Real planner-driven flicks, without teleporting or awarding goals: first shot
  jammed a gate; second won 1-0. Results showed all three earned stars and Next Act.
- Fixed iframe viewports 320, 375, 390 and 430 pixels exercised the real app,
  aim preview and GPU pixel sampling: 79, 74, 61 and 58 distinct byte values.
  The browser viewport override did not resize the isolated tab, so phone checks
  use real nested viewport dimensions instead of claiming device emulation.
- Desktop DOM overflow check was false. Phone screenshots include test controls
  and surrounding workspace; they are evidence, not final marketing crops.
- Baseline 16fb493 was served from a separate temporary archive on port 4182;
  the live repo and Claude clone were not rewound or edited for comparison.
- Known unattributed MutationObserver diagnostic recurred in browser tooling.
  No missing-module or shader compile error was observed during these checks.
- Physical iOS/Android touch, sustained GPU performance, independent art review,
  and manual replay/rotation stress checks remain unverified.

## Captures
Saved outside the repository (no binary assets added):
`/Users/bskt/.codex/visualizations/2026/09/17/01a0af33-a20d-7d71-915a-a1dcf0f3685e/`

- `ink-home-desktop.png`, `ink-home-mobile.png`
- `ink-before-desktop.png`, `ink-gameplay-desktop.png`
- `ink-phone-320.png`, `ink-phone-375.png`, `ink-phone-390.png`, `ink-phone-430.png`
- `ink-aim-390.png`, `ink-result-mobile.png`

Reproduce with `/tests/ink-impact-visual-check.html`. Its planned-flick button
uses the real planner and session, not a mock result. It can earn real local
progress, like playing the game. Use an isolated browser profile for clean saves.

## Venue Identity
The reference contributes hierarchy, ink silhouette and graphic force, not its
characters, industrial setting or layouts. This slice is lighter and less densely
outlined to keep a tiny ball readable. The backdrop still carries considerable
warm ground color; further grading needs art review rather than a universal filter.

The shared ink language preserves these existing constructions:
1. Schoolyard: classroom desks, blue ink and chalk; contour the ruler and eraser.
2. Kiosk: layered hatch and awning, market greens; emphasize the enamel dish rim.
3. Veranda: red oxide and balustrade shadows; readable pot silhouettes and bank marks.
4. Harmattan: pale dust and lorry boards; reserve strong edges for moving goal mouths.
5. Jamestown: controlled bulb pools and deep sea-blue shadows; coin-chain lights lead.

UI-hidden identity and phone aim captures now exist for all six. Goal/replay
stress and sustained performance still need device checks. Roadside architecture
is added only at Tema; no other venue inherits its booths or palette.
