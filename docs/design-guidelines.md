# Counters Ball 3D — Art, Motion & Interface Bible

Photorealistic 3D browser-game art direction: warm documentary realism, Ghanaian
street nostalgia, tactile tabletop materials. Football reduced to its most
imaginative form — a pitch drawn by hand, players made from bottle caps, skill
expressed through a single flick.

## 1. Composition & camera
- 45° tilted-down perspective camera, FOV 42°, slight x-offset for asymmetric
  documentary framing. Base distance 3.85 units, auto-fit: the camera pulls back
  on narrow viewports so the whole pitch always fits (`fitToViewport`).
- Pitch: 3.0 × 2.0 world units on a 4.4 × 3.2 sheet, wooden battens at
  ±1.62/±1.12 (the bounce walls), goal mouths 0.52 wide.
- The camera is directed, never static (`camera-director-attract-intro-play-goal.js`):

| Mode | Behaviour |
|---|---|
| `attract` | Slow yawing sweep around the table behind the menus (±0.55 rad, 0.09 Hz) |
| `intro` | 2.6 s crane-in from high and off to the side, `easeInOutCubic` into the play pose |
| `play` | Breathing drift (0.22/0.31 Hz, ±3 cm) + a 12% lean toward the ball |
| `goal` | Smoothstep push-in toward the scoring goal, 55% positional lerp |

- **Kick:** every flick nudges the camera with a spring impulse along the flick
  direction. **Shake:** trauma-based (`trauma²`) driven by *smooth* summed-sine
  noise, never `Math.random` jitter — and scaled to 30% under reduced motion.

## 2. Palette
| Element | Value | Note |
|---|---|---|
| Ink (line/type) | `#2b1a0c` | Everything is outlined in warm brown, never black |
| Chalk | `#fdf6e6` / dim `#ece1c6` | Never pure white — bloom control |
| Cardboard | `#bd9163` / UI `#d2a978→#b98c5c` | Fibres, corrugation, stains |
| Enamel red (home) | `#a83b2a`, highlight `#d4563f` | ACCRA REDS |
| Gold | `#dfb94f` | Stars, accents, emblem fragments |
| Paper ball | `#e6dcc8` | Crease shadows `#6e5c40` |

Opponent teams each own a hue: Adabraka Blues `#2f5d9a`, Nima Greens `#2c6e4b`,
Ashanti Golds `#c99a2e`, Tema Whites `#e4dccb`, Tamale Oranges `#d0692a`,
Jamestown Stars `#262320` + gold. The team hue drives the cap enamel, HUD dot,
level-card number badge and intro chip — one colour, everywhere that team appears.

## 3. Lighting presets (`lighting-presets-by-time-of-day.js`)
| Preset | Key light | Mood |
|---|---|---|
| `midday` | `#fff0d8` @ 3.3, high | Flat, bright, short shadows — the schoolyard |
| `late-afternoon` | `#ffbe7d` @ 3.1, low left | The house style: long soft shadows |
| `golden-hour` | `#ff9d58` @ 3.5, very low | Long raking shadows, heavy amber |
| `harmattan` | `#ffe4c0` @ 1.7 + hemi 1.15 | Flat diffuse dust, fog pulled to 0.6–8.5 |
| `night-bulb` | Moon `#7f92c4` @ 0.35 + warm spot bulb | One hanging bulb, deep falloff |

Each preset also carries exposure, fog range, haze colour/amount, grain amount,
backdrop tint and sun-glow colour, so a venue is a single coherent look.

## 4. Materiality rules
- **Everything procedural** (canvas 2D → `CanvasTexture`): no binary assets; wear
  is seeded per venue so it is identical on every load.
- **Cardboard:** 5200 fibre hairs, corrugation banding, water stains, marker
  scuffs, edge darkening; `dusty` variant adds harmattan film and pale blotches.
- **Wood:** wavy multi-octave grain, knots as concentric rings, varnish worn
  where elbows rest, plank seams on the school desk, and initials carved in the
  margins (`KOJO`, `BLACK STARS`) scratched light over a dark offset.
- **Caps:** scalloped 21-flute flared skirt (vertex displacement), per-cap random
  scale 0.96–1.04 and resting tilt; tops get paint chips to bare metal, rust
  specks, scratches and fingerprint ridges at ~7% alpha. Emblems: star, ring +
  number, diagonal stripes, dot.
- **Ball:** displaced icosahedron (±8%) with paper creases — visibly smaller,
  lighter and less predictable than the caps.
- **Goals:** matchstick posts with burnt heads, hand-planted lean, matchstick
  crossbar; posts are physical, so shots rattle off the woodwork.
- **Obstacles:** flattened pebbles, a capless glass bottle with a paper label,
  stacked brass/nickel coins. All are static circles in physics.
- **Chalk lines:** never straight — jittered segments, varying alpha, dust bleed,
  palm smudges along the touchlines.

## 4b. Venue environments (`src/scene/environment/`)
**Principle — the world lives at your feet.** The 45° play camera's top edge meets
the ground ~6 units (≈1.2 m) behind the table and never sees the sky, so each
venue is built where the eye actually lands: the ground, what lies on it, and
the base of the building behind. Everything is true to bottle-cap scale
(1 unit ≈ 19 cm) and pushed back into a **depth-of-field sharp zone**: the whole
pitch stays crisp (±1.9 units of focus), the street falls off into bokeh.

| Venue | Ground | On the ground | Behind | Air |
|---|---|---|---|---|
| Adabraka Primary | trampled playground, chalk hopscotch | school bag, exercise book, sandals, caps | cream classroom block, louvre windows, school sign | neem leaf shade |
| Nima Market Road | red laterite, tyre tracks, oil stains | bottle crate, basin of oranges, sachets, caps | blue container kiosk, stocked hatch, "GOD'S TIME IS THE BEST" | light shade, motes |
| Auntie Ama's veranda | polished red screed with scored squares, swept yard | raffia mat, slippers, snake plants in tins, oranges | terracotta house, green shutters | mango leaf shade |
| Tema Junction | laterite shoulder, open gutter with loose slabs, asphalt | old tyre, coal pot, sachets | chop bar menu board, "NO KING AS GOD" | chickens cross the road |
| Tamale Lorry Station | pale compacted sand, deep ruts | grain sacks, jerrycan, tyre | chalk destination board | harmattan dust banks, guinea fowl |
| Jamestown | cracked damp concrete, sand, fish-scale glints | fishing net pile, lit coal pot, basin | canoe-stripe mural, lit "MAGIC SPOT" hatch | bulb + hatch spill flicker together |

- **Animals:** chickens (guinea fowl in the north) wander, peck, look around and
  scatter flapping on every goal. They stay at the top edge of frame so only
  soft legs and bellies pass through — never a foreground prop.
- **Props are real geometry**, casting and receiving real shadows (sun shadow
  box widened to ±7.5, 4096² map, so the table itself shades the ground).
- **Rejected:** sleeping dog/cat built from primitives (read as toys at this
  distance); a sky dome (never on screen).

## 5. Motion & feedback grammar
The rule: **every contact produces sound, particles, deformation and camera
response, scaled by one shared 0..1 strength** (impulse → approach speed).

- **Aim:** hover glow on flickable caps; drag back for a curved dashed
  trajectory (quadratic bezier, 7% lateral bow) plus a power ring that sweeps
  clockwise and warms chalk → orange → red. The cap sinks into the table and
  leans its top toward the finger.
- **Release:** squash-and-overshoot spring on the cap, dust puff, fingernail-snap
  sound, camera kick along the flick.
- **Impact:** hit-stop of 20–85 ms on the strike (the whole sim freezes, which is
  what gives a flick its weight), dust puff at the contact point, cap wobble away
  from the normal, ball hop, material-correct sound (metal / paper / wood /
  stone / glass).
- **Drama:** when a shot is on target and within 0.45 of the goal line, time
  drops to 0.28× for half a second — including near misses off the post.
- **Goal:** whistle, crowd swell (or groan), 180 paper scraps in newsprint and
  flag colours that flutter down and *stay on the table* until kickoff, goal
  wobble, camera push-in, trauma shake, bloom pulse, slammed `GOOOAL!` banner.

## 6. Post stack (order matters)
Render → Bokeh depth of field (sharp zone ±1.9 around the look target, then
aperture 0.004 up to 0.013 max blur; focus tracks the camera director) → UnrealBloom (0.22 base, 0.32 at night, threshold 0.93) → OutputPass
(ACES, per-preset exposure) → grain pass **after** tone mapping, like real film:
35mm hash grain, warm grade, dust-haze veil toward the light, vignette floor
0.72. The CSS `#film-frame` inset shadow completes the frame.

## 7. Audio (all synthesised, no files)
Metal caps are inharmonic partials (1 : 2.76 : 5.4) with a noise transient; the
paper ball is a low-passed thud; battens are a 190 Hz body plus a knock; stones
are a tight band-passed clack; the bottle rings at 3150/4730 Hz. The referee
whistle is a 2750 Hz tone with a 38 Hz vibrato "pea". Ambience beds: filtered
street hum, gusting harmattan wind, or gated crickets at night.

## 8. Interface
- **Voice:** cardboard cards held down with masking tape, chalk headings
  (Cabin Sketch), display type for names and numbers (Lilita One), handwriting
  for body copy (Patrick Hand). Buttons are painted sign boards with a hard ink
  shadow that presses down 4 px on `:active`.
- **Logo:** a crown cap in enamel red with a gold dashed inner ring and the Black
  Star at its centre, chalk flick-streaks trailing behind, a paper ball flying
  off, and sticker-cut wordmark. Animated on the title screen: the cap drops and
  settles, streaks draw on, the ball flies in, the `3D` tag slaps down.
- **Level cards:** cardboard tickets, tilted a degree or two, tape at the top,
  a bottle-cap number badge in the opponent's colour (dotted outline = flutes),
  star row, and a chalk lock plate when not yet unlocked.
- **HUD:** floating glass pill with team dots, score (pops gold on a goal),
  flick counts that turn warm and pulse at ≤3 left, turn banner, goal banner.
- On level 1 a chalk hand loops the drag gesture, anchored by projecting the
  striker's world position to screen space.

## 9. Anti-goals (what breaks the direction)
- Pure white anything — everything is sun-warmed.
- Neon/sci-fi glow: bloom threshold stays ≥ 0.9; the aim ring and rim glow are
  the only deliberate additive UI in the scene.
- Perfect geometry: no straight chalk line, no upright post, no two caps alike.
- Random jitter as "juice": shake is smooth-noise, springs are real springs.
- Sterile emptiness: the frame always carries grain, dust, haze and street colour.
