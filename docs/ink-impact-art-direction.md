# Ink and Impact: Roadside Slice

## Scope
Playable Street Legends Roadside Showdown, with a new Street Legends home.
The treatment follows the toll-gates mechanic, so all three Roadside acts inherit
it. Classic Roadside and the other five venues retain their original rendering.
No physics, difficulty, collision geometry, save identifiers or unlock rules changed.
No deployment. This is a reviewable first visual slice, not approval to roll out
the renderer across the entire campaign.

## Art Direction
- Ink #101514, paper #f5f1df, signal yellow #f0cf45. Red caps and ivory rivals
  retain team identity. Green/amber/red continue to mean real toll states.
- Original seeded canvas cap illustration: scalloped metal, star enamel, chipped
  print, halftone shading and directional scrape. No reference artwork copied.
- Home uses the implemented Tema table and toll canopy in a dedicated attract
  composition. Play Roadside enters the real first act; all 18 acts, Classic and
  local two-player remain accessible. No online mode is implied.
- Selective contours on the toll architecture and ball; one ground silhouette
  around each cap. No global edge-detection pass and no distant-brick outlines.
- Gentle five-band light quantization mixed at 25%, preserving surface textures
  and venue color. Cooler sky bounce offsets the existing warm roadside ground.
- Paired service booths, window ledges, lamps, repaired kerbs and drainage strips
  reinforce the junction in depth. Static meshes are merged by material.
- Compact ink scoreboard and objective at the top; turn ownership at the bottom.
  Goals use the actual score, venue and mechanic label in the existing timed lane.
- Strong contacts/release produce a bounded pool of angular ground strokes for
  180 ms. Below .28 strength they do not fire. Reduced motion suppresses them;
  the session clock freezes them on pause. Existing broad Flick Vector is retained.

## Verification
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

## Comparison and Next Venues
The reference contributes hierarchy, ink silhouette and graphic force, not its
characters, industrial setting or layouts. This slice is lighter and less densely
outlined to keep a tiny ball readable. The backdrop still carries considerable
warm ground color; further grading needs art review rather than a universal filter.

Apply the system one venue at a time only after this slice is reviewed:
1. Schoolyard: classroom desks, blue ink and chalk; contour the ruler and eraser.
2. Kiosk: layered hatch and awning, market greens; emphasize the enamel dish rim.
3. Veranda: red oxide and balustrade shadows; readable pot silhouettes and bank marks.
4. Harmattan: pale dust and lorry boards; reserve strong edges for moving goal mouths.
5. Jamestown: controlled bulb pools and deep sea-blue shadows; coin-chain lights lead.

Each needs its own UI-hidden identity capture, phone aim/goal test and cost check.
Do not automatically apply the Roadside palette or contour every environment mesh.
