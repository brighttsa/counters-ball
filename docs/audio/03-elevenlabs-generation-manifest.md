# 04-05. ElevenLabs Generation Manifest and Exact Prompts

Status: **proposal; zero assets generated**. Every path below is a **planned target
filename**, not a claim that the file exists. Generate lossless WAV masters, review
them, then derive deployment files. Do not place unapproved generations in
`assets/audio/`.

## Generation rules

- Generate one isolated performance per file, 48 kHz/24-bit WAV where available.
- Generate variants as separate performances, never as pitch-shifted copies.
- Leave no baked music, limiter pumping, stereo widening or synthetic sub-bass.
- Core impacts should be mono or narrow stereo. Ambience should be natural stereo.
- Keep 100-250 ms of clean room tone around non-looping Foley for editing.
- Beds require at least 45 seconds of stable material and a loop-safe middle region.
- Human reactions must be nonverbal. Do not synthesize Ghanaian speech, accents,
  chants or culturally specific calls without owner-supplied authentic direction.
- Audition generations at phone-speaker level and on headphones before acceptance.

## Exact-prompt notation

Each asset row supplies a `Prompt addendum`. Its exact generation prompt is:

> **Family prompt** + one space + **Prompt addendum**

This concatenation is the complete prompt for that planned file. The family prompt
already states object, material, action, microphone, environment, duration/tail and
avoidances. Addenda change the physical performance, not post-production pitch.

## A. Flicks: 15 assets

**Family prompt:** `Professional Foley studio recording, extreme close microphone inches from a human fingertip flicking the crimped rim of one small painted steel bottle cap across {SURFACE}; physically tiny object, dry isolated take, fingertip contact followed by enamelled-metal attack, compact cap body and immediate surface response, no room ambience, no music, no voice, no coins, no glass, no explosion, no bass boom, no reverb, one action only, total duration under 0.8 seconds.`

| Planned target filename | Force/surface | Prompt addendum |
|---|---|---|
| `core/flick-light-01.wav` | Light/cardboard | `Use clean corrugated card; delicate centered fingertip release, almost no travel, a precise tik and 6 cm skid.` |
| `core/flick-light-02.wav` | Light/cardboard | `Use clean corrugated card; slightly off-center fingertip release, tiny enamel chatter and 9 cm skid.` |
| `core/flick-light-03.wav` | Light/wood | `Use worn varnished wood; soft rim release, one restrained tak and 7 cm dry glide.` |
| `core/flick-light-04.wav` | Light/dusty card | `Use dusty corrugated card; soft release with fine grit, muted attack and very short drag.` |
| `core/flick-light-05.wav` | Light/neutral | `Use a thin card-over-wood tabletop; nail pad barely catches the rim, intimate dry tik, immediate stop.` |
| `core/flick-medium-01.wav` | Medium/cardboard | `Use clean corrugated card; confident straight release, brighter tak, compact metal body and 18 cm skid.` |
| `core/flick-medium-02.wav` | Medium/cardboard | `Use clean corrugated card; diagonal rim release, slight cap chatter, 22 cm textured skid.` |
| `core/flick-medium-03.wav` | Medium/wood | `Use worn varnished wood; firm centered flick, short woody response beneath metal, 20 cm glide.` |
| `core/flick-medium-04.wav` | Medium/dusty card | `Use dusty corrugated card; firm release through fine grit, softened brightness and 14 cm scrape.` |
| `core/flick-medium-05.wav` | Medium/neutral | `Use thin card-over-wood; energetic but controlled release, distinct finger snap, cap attack and brief motion.` |
| `core/flick-hard-01.wav` | Hard/cardboard | `Use clean corrugated card; powerful straight release, sharp KONK attack, tight metal body and fast 35 cm skid.` |
| `core/flick-hard-02.wav` | Hard/cardboard | `Use clean corrugated card; hard diagonal rim release, tiny enamel rattle after attack and fast textured movement.` |
| `core/flick-hard-03.wav` | Hard/wood | `Use worn varnished wood; hard controlled release, bright compact cap body, short wooden response and fast glide.` |
| `core/flick-hard-04.wav` | Hard/dusty card | `Use dusty corrugated card; forceful release, crisp transient constrained by grit, dense short scrape, no oversized low end.` |
| `core/flick-hard-05.wav` | Hard/neutral | `Use thin card-over-wood; maximum believable fingertip force on a tiny cap, hardest compact KONK, immediate movement, no slam.` |

## B. Cap-cap: 18 assets

**Family prompt:** `Extreme close-miked professional Foley recording of two small painted steel bottle caps colliding edge-to-edge on a dry tabletop, {FORCE} compact metallic contact with tiny enamel detail, physically small objects, dry isolated recording, extremely short natural resonance, no room ambience, no bass boom, no coins, no glass, no music, no voice, one impact only, total duration under 0.5 seconds.`

| Planned filenames | Force | Exact prompt addenda for variants 01-06 |
|---|---|---|
| `core/cap-cap-light-01..06.wav` | Light | `01: glancing edge kiss, high tiny tick.` `02: shallow side contact, dry double enamel chatter.` `03: straight low-speed edge touch, centered tick.` `04: one cap almost stationary, muted tick.` `05: rims meet at a slight tilt, brief bright fleck.` `06: cap shoulders brush then separate, soft clink.` |
| `core/cap-cap-medium-01..06.wav` | Medium | `01: square edge collision, dry clack.` `02: diagonal edge collision, short asymmetric rattle.` `03: moving cap hits stationary cap, compact body.` `04: both caps moving, slightly broader clack.` `05: tilted rim collision, bright enamel fleck.` `06: near-center impact, dense short KONK.` |
| `core/cap-cap-hard-01..06.wav` | Hard | `01: high-speed square edge impact, sharp compact KONK.` `02: high-speed diagonal impact, hard attack and tiny rattle.` `03: moving cap drives stationary cap, dense body, very short tail.` `04: opposing fast caps, brightest credible clack.` `05: rim catches rim at tilt, sharp splintered enamel detail without breakage.` `06: hardest physically believable small-cap collision, no cinematic weight.` |

Replace `{FORCE}` with `light`, `medium-force`, or `hard` for its row before
concatenating the selected addendum.

## C. Cap-paper-ball: 15 assets

**Family prompt:** `Extreme close-miked professional Foley recording of one small painted steel bottle cap striking a tiny tightly crumpled paper football on a tabletop, {FORCE} impact, round soft paper body with a restrained metal attack and minute paper-skin crinkle, dry isolated take, physically tiny objects, no room ambience, no bass boom, no rubber ball, no plastic ball, no whistle, no music, no voice, one impact only, total duration under 0.6 seconds.`

| Planned filenames | Force | Exact prompt addenda for variants 01-05 |
|---|---|---|
| `core/cap-ball-light-01..05.wav` | Light | `01: cap edge barely nudges ball, soft papery tup.` `02: shallow glancing nudge, tiny paper fold.` `03: centered low-speed touch, round muted body.` `04: off-center touch, slight paper rotation texture.` `05: cap face brushes ball, shortest delicate contact.` |
| `core/cap-ball-medium-01..05.wav` | Medium | `01: centered strike, clear compact thwack.` `02: edge strike, brighter cap onset and paper crinkle.` `03: diagonal strike, short rolling paper texture.` `04: firm strike into stationary ball, fuller paper body.` `05: slightly compressed paper ball, dry varied fold response.` |
| `core/cap-ball-hard-01..05.wav` | Hard | `01: fast centered hit, sharp attack and dense paper thwack.` `02: hard edge hit, brief bright cap attack and multiple tiny paper folds.` `03: fast glancing hit, compact impact into immediate movement.` `04: hard strike on slightly irregular paper ball, full but physically small body.` `05: maximum credible tiny-object hit, crisp and forceful without cinematic bass.` |

Replace `{FORCE}` as in section B.

## D. Goal post: 8 assets

**Family prompt:** `Extreme close-miked Foley recording of a tiny crumpled paper football striking a narrow improvised painted metal goalpost on a tabletop, bright focused PING with physically small scale, dry studio take, short natural metal decay, no stadium, no crowd, no whistle, no music, no bass boom, no glass, one isolated hit, total duration under 0.8 seconds.`

| Planned filenames | Exact prompt addenda |
|---|---|
| `core/ball-post-light-01..04.wav` | `01: very light direct touch, pure narrow ping.` `02: light glancing contact, shorter brighter ping.` `03: light hit near the post base, slightly muted body.` `04: light hit near the upper bar joint, tiny secondary tick.` |
| `core/ball-post-hard-01..04.wav` | `01: hard direct hit, vivid narrow PING and short decay.` `02: hard glancing hit, bright attack with fast pitch scatter.` `03: hard base hit, compact structural knock beneath the ping.` `04: hard joint hit, recognizable ping with one tiny after-rattle.` |

## E. Surface movement: 60 assets

Create each five-part pool for each implemented surface. Planned names follow
`movement/cap-{surface}-{motion}-{01..04}.wav`.

**Clean-cardboard family prompt:** `Extreme close-miked professional Foley of one small painted steel bottle cap moving on clean dry corrugated card laid over a table, {MOTION}, intimate grit and paper-fibre detail, physically tiny object, dry isolated recording, no room ambience, no hand contact, no collision, no music, no voice, no bass enhancement, natural ending, {DURATION}.`

**Dusty-cardboard family prompt:** `Extreme close-miked professional Foley of one small painted steel bottle cap moving on dusty corrugated card, {MOTION}, audible fine dry grit and higher friction without sandstorm exaggeration, physically tiny object, dry isolated recording, no room ambience, no hand contact, no collision, no music, no voice, no bass enhancement, natural ending, {DURATION}.`

**Worn-wood family prompt:** `Extreme close-miked professional Foley of one small painted steel bottle cap moving on worn varnished wooden tabletop, {MOTION}, close lacquer texture with restrained wooden resonance, physically tiny object, dry isolated recording, no room ambience, no hand contact, no collision, no music, no voice, no bass enhancement, natural ending, {DURATION}.`

For **each** surface, generate the exact following planned assets and addenda:

| Planned motion files per surface | `{MOTION}` / `{DURATION}` | Exact addenda 01-04 |
|---|---|---|
| `slide-short-01..04` | `a single short decelerating slide` / `0.25 to 0.55 seconds` | `01: straight 8 cm slide, clean stop.` `02: diagonal 12 cm slide, slight rim chatter.` `03: 6 cm slide with one surface irregularity.` `04: 10 cm slide beginning faster and settling softly.` |
| `slide-long-01..04` | `a single long decelerating slide` / `0.8 to 1.5 seconds` | `01: straight sustained glide, smooth energy loss.` `02: diagonal glide, subtle changing rim pressure.` `03: fast start with two tiny surface chatter details.` `04: moderate start and long quiet tail into rest.` |
| `spin-01..04` | `a free cap spin in place with audible rim rotation` / `0.7 to 1.6 seconds` | `01: fast stable spin decelerating naturally.` `02: medium spin with slight eccentricity.` `03: fast spin that begins to precess near the end.` `04: slower textured spin with sparse rim ticks.` |
| `wobble-01..04` | `the final low-energy precessing wobble before rest` / `0.35 to 0.9 seconds` | `01: even wobble, three diminishing rim contacts.` `02: irregular wobble, two close ticks then stop.` `03: shallow wide wobble, soft final contact.` `04: tight quick wobble with a tiny enamel chatter.` |
| `settle-01..04` | `the cap making its final tiny settling movement` / `under 0.35 seconds` | `01: one minute rim tick into silence.` `02: two diminishing micro-ticks.` `03: tiny face-down settle with muted body.` `04: slight tilted settle, delicate enamel click.` |

This is 20 unique physical performances per surface and 60 total; do not derive
the dusty or wood set by EQ/pitch processing of clean cardboard.

## F. Rails and Street Legends mechanisms: 36 assets

**Shared mechanism prompt:** `Extreme close-miked professional Foley of {ACTION}, physically small improvised tabletop-sport object, dry isolated studio recording, material-accurate compact transient and natural short decay, no room ambience, no music, no voice, no cinematic bass, no explosion, one action only, total duration under 1 second.`

| Planned target pool | Variants | Replace `{ACTION}` with these exact descriptions |
|---|---:|---|
| `mechanics/ball-wood-rail-01..04.wav` | 4 | `a tiny crumpled paper ball striking a worn wooden table rail: 01 light direct, 02 light glancing, 03 hard direct, 04 hard glancing` |
| `mechanics/ruler-pivot-01..03.wav` | 3 | `a short school ruler pivoting on a tabletop pin and stopping: 01 gentle, 02 brisk, 03 brisk with one tiny rebound` |
| `mechanics/ruler-hit-01..03.wav` | 3 | `a tiny paper ball striking the edge of a school ruler: 01 light, 02 medium, 03 hard` |
| `mechanics/enamel-dish-turn-01..03.wav` | 3 | `a small enamel change dish rotating one notch on cardboard: 01 clean tick, 02 slight scrape, 03 tick with tiny rim rattle` |
| `mechanics/enamel-dish-hit-01..03.wav` | 3 | `a tiny paper ball striking a small enamel change dish rim: 01 light ping, 02 medium clack, 03 hard compact rattle` |
| `mechanics/clay-pot-hit-01..04.wav` | 4 | `a tiny paper ball striking a miniature unglazed clay pot: 01 light hollow tap, 02 medium rim tap, 03 hard body clack, 04 glancing scrape-tap` |
| `mechanics/toll-boom-01..03.wav` | 3 | `a miniature painted toll barrier arm moving and latching: 01 lift stop, 02 lower latch, 03 jammed strained stop` |
| `mechanics/lorry-move-01..03.wav` | 3 | `a small toy lorry rolling one short tabletop step and stopping: 01 smooth wheels, 02 slight wheel chatter, 03 dusty wheels with tailboard tick` |
| `mechanics/coin-stack-hit-01..04.wav` | 4 | `a small stacked group of Ghanaian-style metal coins struck by a bottle cap: 01 light lower stack, 02 medium lower stack, 03 firm tall stack, 04 hard compact stack without spill` |
| `mechanics/padlock-release-01..03.wav` | 3 | `a miniature metal padlock shackle releasing on a tabletop goal: 01 soft click, 02 click with short spring, 03 decisive compact clack` |
| `mechanics/glass-bottle-hit-01..03.wav` | 3 | `a painted steel bottle cap contacting the side of a small empty glass bottle: 01 light tick, 02 medium bright clink, 03 hard safe contact with short glass ring` |

Each numbered description is a separate prompt substitution and performance.

## G. UI: 20 assets

**UI family prompt:** `Extreme close-miked tactile Foley for a game interface, {ACTION}, made from one small painted steel bottle cap and tabletop materials, clean compact transient, dry isolated studio recording, physically tiny scale, no electronic beep, no music, no voice, no room ambience, no bass boom, total duration under 0.8 seconds.`

| Planned target pool | Count | Exact `{ACTION}` substitutions |
|---|---:|---|
| `ui/navigate-01..04.wav` | 4 | `01 a muted cap rim tick on cardboard` `02 a softer off-center cap tick on wood` `03 a delicate enamel side tick` `04 a tiny cap placement with no ring` |
| `ui/select-01..04.wav` | 4 | `01 a clean cap tap with short tonal body` `02 a firmer centered cap tap` `03 a crisp rim-then-face tap` `04 a warm wood-backed cap tap` |
| `ui/back-01..03.wav` | 3 | `01 a 3 cm soft reverse scrape ending in muted tick` `02 a 4 cm cardboard scrape and soft stop` `03 a short wood scrape ending in a dry tick` |
| `ui/locked-01..03.wav` | 3 | `01 a dull cap face contact with immediate dead stop` `02 a muted cap against folded cardboard` `03 a short low enamel thunk with no ring` |
| `ui/unlock-01..03.wav` | 3 | `01 a 0.45 second cap spin accelerating in brightness then a satisfying compact KONK` `02 an irregular cap shimmer resolving into one clean KONK` `03 a short wood-backed cap spin resolving into a bright compact KONK` |
| `ui/match-start-01..03.wav` | 3 | `01 tik, tik-tik, 100 millisecond pause, compact KONK` `02 two muted setup taps, one quicker answer, pause, firm KONK` `03 cap placement, double rim tick, pause, hardest physically small KONK` |

Pause and resume should initially reuse carefully selected navigate/back variants;
do not add more assets until usability testing proves they need unique identities.

## H. Human reactions: 25 assets

**Reaction family prompt:** `Natural location Foley recording of a small nearby group of four to seven children and adults reacting nonverbally to an intimate tabletop game, {REACTION}, warm spontaneous human performance, Ghanaian neighborhood scale without invented words or accents, no intelligible speech, no chant, no stadium crowd, no announcer, no music, no whistles, clean background, short natural tail, {DURATION}.`

| Planned target pool | Count | Exact `{REACTION}` substitutions and duration |
|---|---:|---|
| `reactions/cheer-small-01..04.wav` | 4 | `four distinct restrained pleased reactions to a normal goal` / `0.5-1.0 s` |
| `reactions/cheer-medium-01..04.wav` | 4 | `four distinct lively reactions to a skillful goal, one brief clap at most` / `0.8-1.4 s` |
| `reactions/cheer-huge-01..03.wav` | 3 | `three distinct excited reactions to a decisive match-winning goal, still a small group` / `1.2-2.2 s` |
| `reactions/near-miss-oh-01..04.wav` | 4 | `four distinct synchronized breathy nonverbal near-miss reactions, no spoken word` / `0.35-0.8 s` |
| `reactions/surprise-01..03.wav` | 3 | `three brief nonverbal surprised reactions to an absurd ricochet` / `0.4-0.9 s` |
| `reactions/laughter-01..02.wav` | 2 | `two tiny warm shared laughs after playful physical chaos, never mocking` / `0.7-1.4 s` |
| `reactions/disappointment-01..02.wav` | 2 | `two restrained nonverbal disappointed exhales after a loss` / `0.6-1.1 s` |
| `reactions/anticipation-01..03.wav` | 3 | `three quiet inhaled tension murmurs with no words, suitable before match point` / `0.5-1.0 s` |

For every row, each numbered file must be a separately performed take. Human
assets require owner listening approval before implementation.

## I. Six venue packages: 50 assets

Ambience prompts prohibit intelligible speech. Planned beds are stereo; other
events may be mono and spatialized at runtime.

### Schoolyard package

| Planned target | Exact ElevenLabs prompt |
|---|---|
| `venues/schoolyard/bed-01.wav` | `Natural stereo ambience at a modest Accra primary-school playground during midday break, open dry exterior, distant diffuse pupil activity with no intelligible words, soft air and occasional far foot movement, stable low-detail bed, no close birds, no music, no whistle, no stadium crowd, 60 seconds, loop-friendly center, gentle tail.` |
| `venues/schoolyard/footsteps-earth-01..02.wav` | `Distant small group of school shoes crossing packed dry earth, two separately performed passes, no voices, open exterior, 2 to 4 seconds, natural tail.` |
| `venues/schoolyard/ball-bounce-distant-01..02.wav` | `Two separately performed distant lightweight playground ball bounce sequences on packed earth, three irregular bounces, no voices, open exterior, under 3 seconds.` |
| `venues/schoolyard/bell-distant-01..02.wav` | `Two separately performed distant modest hand-operated school bell rings across an open playground, recognizable but not piercing, no voices, no music, 2 to 4 seconds.` |
| `venues/schoolyard/door-louvre-01.wav` | `Mid-distance painted school door and glass louvre giving one small movement and settle in an open courtyard, no slam, no voices, under 2 seconds.` |

### Kiosk package

| Planned target | Exact ElevenLabs prompt |
|---|---|
| `venues/kiosk/bed-01.wav` | `Natural stereo ambience beside a small corrugated-metal kiosk on Nima Market Road in late afternoon, shaded roadside air, very soft diffuse market and road presence with no intelligible speech, stable low-detail bed, no music, no crowd chant, 60 seconds, loop-friendly center, gentle tail.` |
| `venues/kiosk/footstep-pass-01..02.wav` | `Two separately performed mid-distance pedestrian passes on hard-packed laterite beside a small kiosk, no speech, 2 to 4 seconds.` |
| `venues/kiosk/bottle-crate-01..02.wav` | `Two separately performed mid-distance glass drink bottle returns into a wooden or plastic kiosk crate, compact clink, no breaking glass, no voices, under 2 seconds.` |
| `venues/kiosk/vehicle-distant-01..02.wav` | `Two distinct distant road vehicle passes heard from beside a kiosk, broad natural perspective, no horn, no music, 3 to 6 seconds.` |
| `venues/kiosk/hatch-flex-01.wav` | `Close-to-mid-distance small corrugated-metal kiosk hatch flexing and settling once, short bright sheet-metal character, no slam, no voice, under 2 seconds.` |

### Veranda package

| Planned target | Exact ElevenLabs prompt |
|---|---|
| `venues/veranda/bed-01.wav` | `Natural stereo ambience in a quiet domestic veranda compound in Kumasi at golden hour, slightly enclosed courtyard air with subtle short reflections, faint distant neighborhood life without intelligible speech, no music, no stadium crowd, 60 seconds, loop-friendly center.` |
| `venues/veranda/slippers-screed-01..02.wav` | `Two separately performed nearby short passes of soft slippers on polished red screed, intimate domestic scale, no voice, 1 to 3 seconds.` |
| `venues/veranda/leaves-01..02.wav` | `Two distinct gentle potted-plant leaf movements in a sheltered veranda breeze, sparse and close, no birds, 2 to 4 seconds.` |
| `venues/veranda/household-distant-01..02.wav` | `Two distinct very soft distant household object movements from inside a compound, no intelligible speech, no identifiable appliance, 1 to 3 seconds.` |
| `venues/veranda/shutter-tick-01.wav` | `One nearby wooden veranda shutter shifting against its catch and settling, warm short reflection, no slam, under 2 seconds.` |

### Roadside package

| Planned target | Exact ElevenLabs prompt |
|---|---|
| `venues/roadside/bed-01.wav` | `Natural wide stereo ambience at the edge of Tema Motorway Junction in late afternoon, broad distant traffic wash beyond an open gutter, low chop-bar activity with no intelligible speech, stable restrained bed, no close horns, no music, 60 seconds, loop-friendly center.` |
| `venues/roadside/vehicle-pass-01..03.wav` | `Three separately performed individual mid-to-distant road vehicle passes at varied speeds, natural approach and departure, no horn, no music, 4 to 8 seconds.` |
| `venues/roadside/horn-far-01..02.wav` | `Two distinct very distant single vehicle horns across a motorway junction, filtered by distance, not alarming, under 2 seconds.` |
| `venues/roadside/utensil-coalpot-01..02.wav` | `Two distinct small mid-distance metal utensil or coal-pot contacts at a roadside chop bar, compact and sparse, no cooking sizzle, no voices, under 2 seconds.` |
| `venues/roadside/gutter-resonance-01.wav` | `A small object or footstep causing one subtle hollow concrete gutter-edge resonance, mid-distance, physically ordinary, no dramatic boom, under 2 seconds.` |

### Harmattan package

| Planned target | Exact ElevenLabs prompt |
|---|---|
| `venues/harmattan/bed-01.wav` | `Natural stereo ambience at Tamale Lorry Station during dry harmattan, fine dusty wind, very distant idling and loading presence, sparse human activity with no intelligible speech, stable restrained bed, no music, no dramatic storm, 60 seconds, loop-friendly center.` |
| `venues/harmattan/sack-shift-01..02.wav` | `Two separately performed grain sacks shifting on dry sandy ground at mid distance, fibrous scrape and soft weight, no voice, 1 to 3 seconds.` |
| `venues/harmattan/jerrycan-01..02.wav` | `Two distinct small plastic jerrycan handling contacts at mid distance, dry hollow plastic, no pouring, no voice, under 2 seconds.` |
| `venues/harmattan/guinea-fowl-01..02.wav` | `Two distinct sparse guinea fowl call-and-footstep moments at a northern Ghana lorry station, one bird close-to-mid distance, natural and brief, no chickens, no human voice, 2 to 4 seconds.` |
| `venues/harmattan/lorry-distant-01..02.wav` | `Two distinct distant lorry idle or departure moments through dusty open air, restrained low-frequency content, no horn, no voice, 4 to 7 seconds.` |

### Lights Out package

| Planned target | Exact ElevenLabs prompt |
|---|---|
| `venues/night/bed-01.wav` | `Natural stereo late-night ambience by a small Jamestown fishing-quay kiosk, humid quiet air, sparse insects and extremely distant waterfront depth, no waves dominating, no intelligible speech, no music, no stadium crowd, 60 seconds, loop-friendly center.` |
| `venues/night/rope-net-01..02.wav` | `Two separately performed nearby fishing rope and net movements, dry fibre creak and soft drag, no boat engine, no voices, 2 to 4 seconds.` |
| `venues/night/footstep-concrete-01..02.wav` | `Two distinct distant single-person footstep passes on slightly damp cracked concrete at night, sparse, no speech, 2 to 4 seconds.` |
| `venues/night/coalpot-tick-01..02.wav` | `Two distinct tiny cooling metal ticks from a nearby charcoal coal pot, isolated and quiet, no fire roar, under 2 seconds.` |
| `venues/night/bulb-fixture-01.wav` | `Very faint old kiosk bulb and metal fixture electrical-mechanical buzz with one tiny fixture tick, close but unobtrusive, no horror tone, no music, 3 seconds with clean tail.` |

## J. Street Legends entrances: 6 assets

**Entrance family prompt:** `A 1 to 2 second tactile level-introduction sting built only from the stated real venue object followed by two or three close-miked painted bottle-cap KONK rhythm hits, warm playful competitive tone, physically tiny tabletop scale, dry clean mix, immediate ending back to natural ambience, no orchestral music, no electronic riser, no voice, no huge bass, no reverb wash.`

| Planned target | Exact prompt addendum |
|---|---|
| `legends/intro-schoolyard.wav` | `Begin with a short ruler pivot-stop, then three light-to-firm cap hits.` |
| `legends/intro-kiosk.wav` | `Begin with one enamel change-dish rim tick, then two syncopated cap hits.` |
| `legends/intro-veranda.wav` | `Begin with one hollow clay-pot tap, then three warm wood-backed cap hits.` |
| `legends/intro-roadside.wav` | `Begin with a compact toll-boom latch, then two firm cap hits.` |
| `legends/intro-harmattan.wav` | `Begin with a tiny toy-lorry wheel stop, then three dry dusty-card cap hits.` |
| `legends/intro-night.wav` | `Begin with three ascending coin-stack contacts, then one decisive compact KONK.` |

## Generation order and acceptance

1. Generate a **proof batch only**: three flicks (light/medium/hard), three cap-cap,
   three cap-ball, two post hits, and one movement sequence per surface.
2. Blind-test the proof batch against the current procedural sounds with music off.
3. Adjust prompt language and approve the sonic scale before bulk generation.
4. Generate remaining core Foley, then UI/mechanics, reactions, and venues in that
   order. Never generate all 238 planned files in one blind batch.
5. Record source prompt, ElevenLabs model/version, seed if exposed, generation date,
   licence/export settings, editor decisions and rejection reason in a machine-readable
   sidecar manifest.
6. Reject any take with cinematic low end, obvious synthesis, clipped attack,
   baked ambience on close Foley, speech, musical contamination or wrong material.

Planned count: 15 flick + 18 cap-cap + 15 cap-ball + 8 post + 60 movement
+ 36 rails/mechanics + 20 UI + 25 reactions + 50 venue + 6 introductions =
**253 candidate masters**. Runtime should ship only selected winners; the count is a
production pool, not a download requirement.
