# Venue and Flick Vector Handoff

Implementation and verification: 2026-09-22, `codex/workspace`, port 4181.
Implementation commits: `5301752` (venues), `cb5a228` (aiming and camera).

## Delivered
- Six seeded surface profiles, matched albedo/bump/roughness wear, profile-based
  chalk/paint/marker lines, distinct outer silhouettes, supports, rails and goals.
  Surface edits remain outside standardized physics bounds; goal colliders match.
- School courtyard, market hatch/awning, domestic veranda, roadside lane/chop bar,
  dusty station/lorry silhouettes and Jamestown kiosk/quay construction. Near props
  are visible from play; ambient motion freezes with pause/reduced motion.
- Six 2.8-second opening compositions. Desktop framing reveals more surroundings;
  the quarter-turn portrait camera remains. Human aim freezes pose and FOV;
  release, cancellation, resize and disposal unlock tracking.
- Grounded origin ring, viewport-scaled tapered ivory ribbon, broad head, gold
  core, restrained enamel maximum-power edge and first-contact ghost. The graphic
  communicates direction/power, not travel distance. Ghost range is conservative;
  no rebound path or future ball motion is shown. Release snaps the vector off
  and emits a short pausable origin flash and backward scrape.
- Licensed same-origin photo configuration now includes bounded saturation,
  temperature, blur and opacity. All photographs remain disabled; no assets added.

## Evidence
- Full Node suite: **90 passed, zero failed, zero skipped**, using Three r160 at
  `/private/tmp/counters-ball-test-three-r160.mjs` and the documented test command.
- Source syntax and whitespace checks pass; new runtime modules remain under 200 lines.
- Real browser on 4181: captured all six play views with UI hidden, all six
  openings, and aim at 320/375/390/430 widths. Canvas sampling returned diverse
  values (97-137 in final desktop venue captures), not a blank render.
- A real browser pointer drag launched the cap and entered `moving`; vector
  disappeared. Campaign selector showed the new material labels; opening
  advanced into play. Human/AI turns were observed. At 375px, no horizontal overflow.
- A short desktop-host animation sample at phone-sized viewport reported
  112.6 frames/s. This is not a phone GPU benchmark or sustained performance claim.
- Deterministic tests cover projected widths, first contacts, tangency/overlap,
  moving away from contact, friction range, pausable release, camera lock,
  cancel/resize/blur/multiple pointers, collider parity, geometry, seeded maps,
  ambient lifecycle and photo failures/disposal.

Screenshot directory (outside the repository, no binary assets committed):
`/Users/bskt/.codex/visualizations/2026/09/17/01a0af33-a20d-7d71-915a-a1dcf0f3685e/`

Key artifacts: `venue-comparison.png`, `intro-comparison.png`, `aim-320.png`,
`aim-375.png`, `aim-390.png`, `aim-430.png`, `actual-drag-release.png`.
`tests/visual-verification.html` reproduces views using the real app, not mocks.
Use Refresh modules after edits; Escape restores hidden verification controls.

## Remaining Checks
- Independent review was attempted but the reviewer stopped at the account usage
  limit. Main-session code review and tests are complete; independent review is not.
- Physical phone touch feel, sound listening and sustained device performance
  remain unverified. No public deployment or merge into Claude's clone was done.
- Browser logs contain a recurring `MutationObserver.observe` Node-type error
  without a source URL. No MutationObserver exists in repository code, and the
  game renders/plays, but the source was not established. Do not describe the
  entire browser console as clean. No Three shader or missing-module error appeared.
- Claude should fetch and review the full incoming range before merging the exact
  handoff commit, then verify on port 4180. Do not cherry-pick only the final docs
  commit: construction and aim depend on the preceding implementation commits.
