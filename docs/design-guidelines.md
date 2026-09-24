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
- Camera direction yields to reduced motion and the camera-motion control:

| Mode | Behaviour |
|---|---|
| `attract` | Slow yawing sweep around the table behind the menus (±0.55 rad, 0.09 Hz) |
| `intro` | 2.8 s venue-specific establishing composition easing into the play pose |
| `play` | Breathing drift (0.22/0.31 Hz, ±3 cm) + a 12% lean toward the ball |
| `goal` | Smoothstep push-in toward the scoring goal, 55% positional lerp |

- **Orientation:** below a 0.95 aspect the whole view swings a quarter turn — the
  pitch runs up the screen and the player attacks upward, which is how phones
  hold football. Fitting a wide pitch across a narrow screen instead would push
  the camera back ~54% further and shrink the table. Landscape is unchanged.
- **Kick:** every flick nudges the camera with a spring impulse along the flick
  direction. **Shake:** trauma-based (`trauma²`) driven by *smooth* summed-sine
  noise, never `Math.random` jitter. Motion-off/reduced motion removes directed
  movement and cinematic replay. Play uses damped focus and velocity anticipation;
  match point adds restrained tension. Pause freezes the presentation clock.

## 2. Palette
| Element | Value | Note |
|---|---|---|
| Ink (materials) | `#2b1a0c` | Warm outlines on physical objects |
| Broadcast | `#191b1b` / `#292c2b` | Smoked charcoal interface and rules |
| Chalk | `#fdf6e6` / dim `#ece1c6` | Never pure white — bloom control |
| Cardboard | `#bd9163` | Physical surfaces, small ephemera |
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

Each preset also carries exposure, fog range, haze colour/amount, grain amount
and an optional bulb, so a venue is a single coherent look.

## 4. Materiality rules
- **Procedural by default** (canvas 2D → `CanvasTexture`); wear is seeded per
  venue. Optional licensed photographs never replace playable geometry.
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
- **Goals:** painted wood, bent wire, lashed timber, rusted steel, twigs and PVC
  vary by venue. Four standardized physical post colliders preserve fair shots.
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
| Tema Junction | laterite shoulder, open gutter with loose slabs, asphalt | old tyre, coal pot, sachets | chop bar menu board, "NO KING AS GOD" | Street Legends: toll canopy gantry, booths and booms |
| Tamale Lorry Station | pale compacted sand, deep ruts | grain sacks, jerrycan, tyre | chalk destination board | harmattan dust banks, guinea fowl |
| Jamestown | cracked damp concrete, sand, fish-scale glints | fishing net pile, lit coal pot, basin | canoe-stripe mural, lit "MAGIC SPOT" hatch | bulb + hatch spill flicker together |

- **Animals:** only where the place demands them. Today that means guinea fowl at
  Tamale Lorry Station, which wander, peck and scatter on goals. No universal
  chickens: repeated generic creatures made venues feel assembled, not designed.
- **Street Legends set pieces** are built from the place's architecture (the Tema
  toll plaza, booths, booms and canopy), not scattered props. A mechanic's
  telegraph must read on a phone: lamp, coloured floor pool, and a short chalk
  note on the table beside the prop ("SHUTS NEXT" on the lane, "NEXT: ACROSS" by
  the ruler, "GAP NEXT" in the dish's next gap). Where the note sits carries the
  meaning, so it never says left or right; it reads upright in every camera and
  slides along the table clear of pieces. The HUD line carries only the act's
  goal; the full reading is kept for screen readers. Chalk is solid, never dashed.
- **Props are real geometry**, casting and receiving real shadows (sun shadow
  box ±7.5; 2048² sun map on coarse pointers, 4096² otherwise).
- **Rejected:** sleeping dog/cat built from primitives (read as toys at this
  distance); a sky dome (never on screen).
- **Photography:** disabled by default. Supply a licensed same-origin image,
  credit and license in `location-photograph-configuration.js`. Tune horizon,
  focal point/crop, exposure, grade, haze and bounded parallax. Procedural walls
  occlude the distant plane; soft edges blend it. Failure preserves the venue,
  and disposal aborts loads and frees textures. No remote hotlinks or scraping.

## 5. Motion & feedback grammar
The rule: **every contact produces sound, particles, deformation and camera
response, scaled by one shared 0..1 strength** (impulse → approach speed).

- **Aim:** grounded origin ring, tapered ivory ribbon and broad arrowhead.
  Length/weight express power; gold core and restrained enamel edges signal
  tension without a red laser. One conservative first-contact ghost shows
  approximate alignment, never a full future path. Camera pose/FOV lock during
  human aim; cancellation unlocks without release effects. Width is projected
  to 18–42 px on desktop and 24–52 px on touch (thick, tapered to 62% at the
  neck), the head is twice the shaft width, and a dark outline keeps it legible
  on pale tables. It's never a fixed world-space line.
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
  wobble, camera push-in, trauma shake, bloom pulse and prioritized `GOAL` callout.
- **Flick Craft:** recent gesture samples measure stability and draw speed;
  aligned draws receive at most 8% speed boost. Recognition uses actual contact:
  Sweet Spot needs clean useful human execution; Bank needs productive wall play;
  Counter needs defensive reversal; Street Play needs a successful contact chain.
- **Heat:** bounded skill momentum drives HUD/audio intensity only, with no
  hidden physics advantage. Unrewarded turns cool it.
- **Replay:** timestamped, bounded three-second transform history plays for
  2–4 seconds with Ground/Top/Hero/Tracking views. Always skippable; restores
  transforms without re-scoring. Ending while paused defers rules until resume.

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
Semantic cues cover interaction, contact, skills, match point and outcomes.
Transient sources are capped at 32 and disconnected after ending. Heat lifts
ambience; tension ducks it. These are abstract synthesized cues, not invented
local music or recorded voices. Pause suspends the audio context, including ambience.

## 8. Interface
- **Voice:** 70% charcoal sports/editorial structure, 30% chalk/tape character.
  Condensed system display type, clean body type, handwriting only for notes.
  Use team-color accents, compact controls and visible focus; no nested cards.
- **Logo:** a crown cap in enamel red with a gold dashed inner ring and the Black
  Star at its centre, chalk flick-streaks trailing behind, a paper ball flying
  off, and sticker-cut wordmark. Animated on the title screen: the cap drops and
  settles, streaks draw on, the ball flies in, the `3D` tag slaps down.
- **Circuit:** selected venue hero over the actual generated environment, kept
  short: act, place, one line for opponent, difficulty and terms, the story, and
  stars as glyphs (the live table behind already shows light, surface and props).
  Six connected route buttons
  preview even locked venues; Enter is disabled until unlocked. Mobile scrolls.
- **Intro/results:** short skippable broadcast opening; large final score,
  opponent and star objectives with handwritten finishing notes.
- **HUD:** one table-side frame: score, flick budget and the Street Legends
  objective stack as one strip closed by one yellow edge. Turn ownership is the
  lit side bar, plus a brief call ("Your flick") in the flicks row at each change;
  there is no separate turn box. In a match the camera controls are the only
  corner tray (Sound lives in the pause menu), and while a flick is aimed the
  corner controls fade to 12% so only the score and the table remain. MATCH
  POINT is never called on first-to-1 tables. One priority callout lane uses
  directional entrance/exit driven by elapsed time; reduced motion keeps text.
  Replay skip and camera-motion controls preserve 44px-or-larger targets.
- **Results:** after a win with a next table, Next leads; after a loss or draw,
  Play again leads and takes focus. A loss card never has the opponent's goal
  confetti falling behind it.
- On level 1 a chalk hand loops the drag gesture, anchored by projecting the
  striker's world position to screen space.

## 9. Anti-goals (what breaks the direction)
- Pure white anything — everything is sun-warmed.
- Neon/sci-fi glow: bloom threshold stays ≥ 0.9; the aim ring and rim glow are
  the only deliberate additive UI in the scene.
- Perfect geometry: no straight chalk line, no upright post, no two caps alike.
- Random jitter as "juice": shake is smooth-noise, springs are real springs.
- Sterile emptiness: the frame always carries grain, dust, haze and street colour.

Verification: six play/opening captures and four mobile aim widths inspected on
4181. See `venue-flick-vector-verification.md` for the 90-test result and remaining
independent review, browser diagnostic and physical-device checks.
