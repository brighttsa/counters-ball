---
title: Six venue constructions and the Flick Vector
status: pending
priority: P1
effort: large
branch: codex/workspace
created: 2026-09-18
---

# Scope and Contract

Deliver six recognizable, runtime-generated places and a shared human/AI aiming
system consisting of an origin ring, tapered ribbon, broad head and first-contact
ghost. Preserve campaign IDs, stories, rules, saves, AI, cap formation, obstacles,
friction and every physics boundary. No framework, bundler, binary assets,
unlicensed imagery, full trajectory solver, fake spin or unrelated menu redesign.

The prior broadcast implementation is present but uncommitted. Preserve it;
checkpoint reviewed changes separately before this implementation. Existing
visual verification remains blocked, not silently converted into a pass.

## Current Venue Audit

All six currently share one crate stand, board silhouette, wooden battens,
matchstick goals and chalk marking geometry. All audio is procedural noise beds.
The existing six distinct ground/facade compositions stay as the foundation.

| Level / venue / place | Opponent | Colors and surface | Environment / props | Light / audio | Gameplay |
|---|---|---|---|---|---|
| 1 schoolyard / Schoolyard Break / Adabraka Primary, Accra | Kwame, Adabraka Blues | Tan cardboard, cream/blue classroom, red earth | Hopscotch, louvres, bag, exercise book, slippers, neem shade | Midday / light schoolyard bed | Rookie; 1 goal, 12 flicks, 3-flick star; no obstacles |
| 2 kiosk / Kiosk Corner / Nima Market Road | Esi, Nima Greens | Tan cardboard, blue kiosk, red/gold signs | Corrugated hatch, bottle crate, oranges, sachets, caps | Late afternoon / low market-road bed | Easy; 2 goals, 14 flicks, 6-flick star; no obstacles |
| 3 veranda / Veranda Derby / Auntie Ama's Veranda, Kumasi | Yaw, Ashanti Golds | Honey plywood, red screed, green shutters | Raffia mat, house door, plants, oranges, mango shade | Golden hour / quiet airy bed | Medium; 2 goals, 14 flicks, 7-flick star; 2 pebbles |
| 4 roadside / Roadside Showdown / Tema Motorway Junction | Akosua, Tema Whites | Brown plywood, blue chop bar, charcoal road | Gutter, lane line, tyre, coal pot, sachets | Late afternoon / low traffic bed | Medium; 3 goals, 16 flicks, 10-flick star; bottle and coins |
| 5 harmattan / Harmattan Haze / Tamale Lorry Station | Abdul, Tamale Oranges | Pale dusty cardboard, sand and faded station wall | Destination board, grain sacks, jerrycan, tyre, dust sheets | Harmattan / gusting dust-wind bed | Hard; 2 goals, 14 flicks, 8-flick star; 3 pebbles; friction 1.35 |
| 6 nightbulb / Lights Out Final / Jamestown, under the kiosk bulb | Kofi "Magic", Jamestown Stars | Dark carved planks, teal wall, canoe stripes | Lit hatch, fishing net, charcoal pot, damp concrete | Warm bulb/cool moon / night bed | Champion; 3 goals, 18 flicks, 11-flick star; 2 bottles and coins |

## Construction Direction

| Venue | Play surface and support silhouette | Boundary / goal family | Distinct near world and opening |
|---|---|---|---|
| Schoolyard | Sun-bleached concrete play slab on two blue school-bench piers; faint old court paint under chalk | Low painted timber rails / square painted wood goals | Bench and exercise-book foreground, classroom rhythm; diagonal courtyard establishing view |
| Kiosk | Reused carton panels on a deep counter with red beverage-crate supports; tape seams and printed packaging ghosts | Enamel counter trim / bent wire goals | Awning and stocked hatch, crates flanking counter; reveal beneath awning edge |
| Veranda | Broad honey plywood on open-legged domestic stools; varnish patches and bank-shot scuffs | Rounded wood rails / lashed wooden goals | Red step, green posts and shutters, restrained washing movement; sideways veranda reveal |
| Roadside | Reclaimed painted planks on metal trestles; dirty edges, scraped paint and cup/bottle stains | Patched steel angle rails / rusted steel goals | Gutter, curb and passing distant vehicle silhouette; oblique road-to-table move |
| Harmattan | Flattened dusty carton on a low luggage platform with tied corners; erased chalk and corner drifts | Dry timber edging / stick-and-twine goals | Sacks and lorry silhouettes through dust; high lateral station reveal |
| Jamestown | Dark carved desk boards on narrow metal legs; salt scars and worn paint | Dark metal edging / pale PVC and sparse net goals | Warm practical plus cool shop light, quay details and wires; light-pool-to-table opening |

No rooftop or beach is invented. Jamestown's coastal character remains secondary
to its actual night-kiosk brief. Collision-facing edges remain straight and aligned
with the existing dimensions; irregularity goes outside them. The play plane stays
at y=0. Support depth and surrounding steps create elevation cues without moving
pieces away from input, FX or physics space.

## Implementation Steps

- [ ] A: Review and approve this plan; checkpoint previous broadcast work and
  merge origin/main at 160614f. Pull correctly refused to overwrite dirty camera
  and documentation files. Preserve upstream 90-degree portrait framing (4eb8791)
  and mobile verification handoff; resolve camera integration explicitly.
- [ ] B: Small venue visual profiles keyed by existing backdrop IDs; separate
  surface wear, support/boundary construction and goal builders. Seed texture
  wear, roughness and all persistent decoration. Keep every file under 200 lines.
- [ ] C: Extend existing architecture with genuinely different silhouettes,
  layered framing, cheap ambient movement and venue-specific 2-4 second intros.
  Restrict moving props outside the gameplay view; obey pause/reduced motion.
- [ ] D: Replace dashed aim with reusable mesh geometry and a restrained textured
  material. Measure projected width at the cap using the actual camera/canvas:
  desktop 10-18 CSS-pixel equivalent, coarse/mobile 14-24. Power changes both
  length and width; ivory body, gold core/contact, enamel accent only at high power.
- [ ] E: Pure first-contact estimate using swept cap radius against ball, caps,
  obstacle circles, posts and walls. Show one approximate ghost only, no rebounds
  or future ball path. Gold tightening uses contact alignment, not a success claim.
- [ ] F: Lock actual camera pose/FOV throughout human aim; release/cancel/resize/
  pause/disposal clear lock. Snap vector off on release; short origin expansion
  and directional scrape run on pausable time. Cancellation has no release flash.
- [ ] G: Extend default-disabled photo configuration with saturation, temperature,
  blur and opacity alongside existing crop/focal/horizon/exposure/haze/parallax.
  Same-origin licensed files only; preserve complete procedural fallback.
- [ ] H: Tester and reviewer passes, documentation, focused commits and handoff.

## Interfaces and Ownership

Keep `AimVisuals.show(body,pull)`, `hide()`, `hover(body)` and `update` compatible
with both input and AI. Supply camera/canvas/physics through constructor context.
Keep stage return fields `group/caps/ballMesh/goals/postBodies/backdrop/dispose`.
Visual goals must preserve two post colliders per end with radius .02 at
x=+/-1.5 and z=+/-0.26. Walls remain x=+/-1.62 and z=+/-1.12.
Markings must map to these same world coordinates; no irregular colliders.
Photo/background/intro profiles belong in focused modules, not campaign metadata
bloat. Profile lookup must handle attract mode and nightbulb -> night explicitly.

## Acceptance and Verification

- Deterministic texture/profile construction; distinct geometry signatures for
  all six supports/boundaries/goals, unchanged collider/rule snapshots.
- First-hit tests: ball, cap, obstacle, post, wall, tangent, overlapping start,
  blocked shot, zero pull, both sides; never mutate simulation state.
- Use swept-circle geometry (target radius plus selected cap radius), not a
  zero-width ray. The ghost marks the cap-center pose at contact. Bound its range
  conservatively from pull/friction and show no promise of guaranteed contact;
  release-speed boost can still change the outcome. Goal lines are not colliders.
- Projection tests at 320/375/390/430, tablet and desktop; camera lock across
  drag/release/cancel/multitouch/resize, paused effects, reduced motion.
- Full existing regression suite, source syntax, local imports, file-size checks.
- Visible-browser screenshots with HUD hidden for all six venues, same play
  camera, then six-way contact sheet; separate intro and phone-aim captures.
- Check nonblank changing canvas pixels, console, resource loads, campaign/AI/
  hot-seat/goals/results/restart/pause and representative visible-pane FPS.
- Mandatory visual gate remains outstanding while the browser tool cannot
  verify its admin policy. Do not bypass that restriction or claim screenshots,
  touch feel, cinematic framing or phone performance from CPU tests alone.

## Preview

Use the Codex clone on port 4181 with CommandLineTools Python. No public deployment
is part of this pass. Preserve `.DS_Store` and `.playwright-cli/` untracked files.

## Review

Read-only reviewer checked architecture and proposed tests on 2026-09-18. Plan
incorporates collider parity, expanded-circle contact estimation, projected CSS
width, rendered-camera lock and pausable presentation time. No implementation
changes for this pass yet; human plan approval is the next Cook gate.
