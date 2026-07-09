# Counters Ball 3D — Visual Direction (Art Bible)

Photorealistic 3D browser-game art direction: warm documentary realism, Ghanaian
street nostalgia, tactile tabletop materials. Football reduced to its most
imaginative form — a pitch drawn by hand, players made from bottle caps, skill
expressed through a single flick.

## 1. Composition & camera
- 45° tilted-down perspective camera, FOV 42°, slight x-offset (0.35) for an
  asymmetric documentary framing. Base distance 3.85 units, auto-fit: camera
  pulls back on narrow viewports so the full pitch always fits (`computeFitDistance`).
- Subtle handheld "breathing" drift (`sin` at 0.22/0.31 Hz, ±3 cm) keeps the
  frame alive without reading as camera movement.
- Pitch: 3.0 × 2.0 world units on a 4.4 × 3.2 cardboard sheet, wooden battens
  at ±1.62/±1.12 (the bounce walls), goal mouths 0.52 wide.

## 2. Palette
| Element | Value | Note |
|---|---|---|
| Sun key light | `#ffbe7d` @ 3.1 | Low, from frame-left → long soft shadows |
| Sky bounce | `#ffe2b8` / ground `#8a5a34` | Hemisphere light 0.75 |
| Haze / fog / bg | `#d99e63` | Fog range tied to camera fit distance |
| Cardboard base | `#bd9163` | Fibres, corrugation, stains layered on top |
| Chalk | `#ece1c6` | Dimmed off-white — never pure white (bloom control) |
| Team A (Accra Reds) | `#a83b2a` + cream star | Faded enamel |
| Team B (Kumasi Greens) | `#2c6e4b` + gold ring "11" | Faded enamel |
| Paper ball | `#e6dcc8` | Crease shadows `#6e5c40` |

## 3. Materiality rules
- **Everything procedural** (canvas 2D → `CanvasTexture`): no binary assets;
  wear is seeded (`createSeededRandom`) so it is identical every load.
- **Cardboard:** 5200 fibre hairs, corrugation banding, water stains, marker
  scuffs, radial edge darkening; bump map carries speckle + soft dents.
- **Caps:** scalloped 21-flute flared skirt (vertex displacement on a cylinder),
  per-cap random scale 0.96–1.04 and resting tilt; tops get paint chips down to
  bare metal near the rim, rust specks, scratches (light + dark), fingerprint
  ridge arcs at ~7% alpha. Side material: bare metal, metalness 0.85.
- **Ball:** displaced icosahedron (±8% lumps) with paper crease texture —
  visibly smaller, lighter, less predictable than the caps.
- **Goals:** matchstick posts with burnt heads, hand-planted lean (±0.05 rad),
  matchstick crossbar. Posts are physical (static circle bodies) — shots can
  rattle off the woodwork.
- **Chalk lines:** never straight. 14 px segments with ±2.5 px jitter, per-segment
  alpha 0.42–0.76, shadowBlur 2–4 as dust bleed, palm-smudge radial gradients
  along the touchlines.

## 4. Environment
- Fake depth of field: background planes carry textures pre-blurred at bake
  time (`ctx.filter: blur(14px)`) — no runtime DOF pass.
- Street hints only, never literal: teal wall, mustard kiosk with an illegible
  blurred sign, terracotta house, two soft plastic-chair silhouettes.
- 90 additive dust motes drifting upward through the light; large additive
  sun-glow sprite low on the lit side.

## 5. Motion & feedback grammar
- **Aim:** slingshot drag; curved dashed trajectory line (quadratic bezier with
  a 7% lateral bow), length + opacity ∝ flick power; warm additive rim-glow ring
  pulsing at 6 Hz under the selected cap only.
- **Flick:** cap slides with weight (linear damping 1.7 + constant dusty
  friction 0.32) and spins as it slides; the ball skims (damping 1.0 / 0.14)
  and rolls on the correct axis.
- **Goal:** 2.4 s celebration — smoothstep camera push-in toward the goal
  (55% positional lerp), exponential-decay screen shake (0.035 → 0), bloom
  swell 0.22 → 0.77, chalk-lettered "GOOOAL!" banner, then kickoff reset with
  the conceding team's turn.

## 6. Post stack (order matters)
1. Render → 2. UnrealBloom (strength 0.22, radius 0.6, threshold 0.93 — only
   true highlights bloom) → 3. OutputPass (ACES tone map, exposure 1.12)
   → 4. Grain pass **after** tone mapping, like real film: 35mm hash grain
   0.055, warm grade ×(1.03, 0.99, 0.94), dust-haze veil toward the sunlit
   upper-left, vignette 0.72 floor. CSS `#film-frame` inset shadow completes
   the frame.

## 7. Anti-goals (what breaks the direction)
- Pure white anything (chalk, UI) — everything is sun-warmed.
- Neon/sci-fi glow: bloom threshold stays ≥ 0.9; the rim glow is the only
  deliberate additive UI element in the scene.
- Perfect geometry: no straight chalk line, no upright post, no two caps alike.
- Sterile emptiness: the frame always carries grain, dust, haze, and colour
  hints of the street.

## 8. UI voice
Chalk-toned (`#fdf6e6`) handwritten-style type (Chalkboard SE stack), letter-spaced
caps, warm drop shadows. Teams named for the classic rivalry axis: ACCRA REDS
vs KUMASI GREENS. Hint copy is a single lowercase whisper that fades after the
first flick.
