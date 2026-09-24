# Project Changelog

## 2026-09-24 — Lorry note clear of the kickoff caps

### Fixed
- At a lorry's outer stops, "LORRY NEXT" sat under a corner kickoff cap: the note is wider than the room between
  that cap and the goal line, so sliding along the table never cleared it. When no slide along is clear, a note now
  also shifts across the table by at most 0.12 (under half the 0.28 between lorry stops, and half a toll lane), so
  it still reads as the same stop or lane.
- Since the notes grew, the farthest a note could sit (1.18) was short of where the ruler and lorry notes ask to be
  (1.2), so they were always nudged inward; notes may now reach 1.47, just inside the goal line.

## 2026-09-24 — Chalk score and tallies upright in Tactical view

### Fixed
- The score and flick tallies chalked on the table read sideways in the overhead Tactical view (they turned toward
  the camera's position, which is meaningless from straight above). They now turn to read upright on screen, the
  same way as the venue rule notes, in every camera and in both phone orientations.

## 2026-09-24 — Venue rules chalked on the table

### Changed
- **Each Street Legends venue chalks its rule on the table, next to the prop it is about**, instead of spelling it
  out under the scoreboard. The scoreboard line now carries only the act's goal ("Beat Kwame around the ruler").
  - Schoolyard: "NEXT: ACROSS" between each ruler and the goal it guards.
  - Kiosk: "GAP NEXT" in each gap the change dish leaves next.
  - Veranda: "NO STRAIGHT GOALS", once, by the centre spot.
  - Roadside: "SHUTS NEXT" on the toll lane whose boom comes down next.
  - Harmattan: "LORRY NEXT" at the stop each lorry moves to.
  - Lights Out: "STRIKE · 1/3 LIT" by the stack each side must hit next, in that side's colour, then "GOAL OPEN".
- Where a note sits is half its meaning, so no note says left or right (which flipped with the camera). Notes read
  upright in every camera, have a faint dark edge so pale chalk reads on pale tables, slide along the table to stay
  clear of caps and props, and fade in when they change. Screen readers still hear the full reading.
- The ruler's next-angle ghost line is a solid chalk stroke instead of dashes.

## 2026-09-24 — Match HUD as one frame, and between-match polish

### Changed
- **One frame at the top of a match**: score, flicks left and (on Street Legends tables) the objective now read as
  one strip with one yellow edge, instead of three separate boxes.
- **Whose turn it is** shows in that strip: the side's bar lights, and the flicks row briefly reads "Your flick" or
  "Kwame lines up" in that side's colour. The separate "Your flick" box in the bottom-left corner is gone (it is
  still announced to screen readers).
- **One corner tray**: the Camera button and Tactical peek are joined, and sit alone in the bottom-right corner.
  The Camera button shows a small "CAMERA" caption over the view name instead of a label that wrapped. The floating
  ♪ button steps aside during matches; **Sound** is now in the pause menu.
- **Aim fade**: while you aim, the pause button and camera tray fade right back; the score and the table stay.
- **No MATCH POINT shout on first-to-1 tables**, where every flick is match point.
- **Act card**: eight lines down to five. Opponent, difficulty and terms share one line, the conditions line is gone
  (the live table behind the card shows them), and stars show as ★★☆.
- **Results**: after a loss or draw, **Play again** is the yellow button and takes focus (it used to focus "Acts");
  after a win, Next act leads. The opponent's goal confetti no longer falls behind the loss card.

## 2026-09-24 — Physics feel: rail bite, clean contact, quick settle

### Changed
- **Rail bite**: the table's rails bounce pieces back livelier (0.72, was 0.55) and grip them along their length
  (80% of along-rail speed kept, was 100%), so a piece leaves the rail within a few degrees of the angle it came in.
  Banks now follow the mirror line a player aims by.
- **Clean contact**: a square, centred strike bounces harder (0.8) than a glancing one (0.6), in place of one fixed
  0.72. A well-lined-up hit pops the ball about 5% faster; a thin cut drifts off about 5% softer.
- **Quick settle**: below 0.12 units/s pieces rattle to a stop under extra friction instead of creeping. The slow
  tail at the end of a turn drops from about 0.34 s to 0.11 s on average, and a whole turn from 1.68 s to 1.48 s.
- All three live in `src/gameplay/flick-feel-contact-rail-and-settle-rules.js`; the computer rehearses its shots on
  the same engine, so its planning follows them. Its goal rate in a 60-flick check is unchanged within noise
  (medium 4 → 6, hard 9 → 8), and all Street Legends venue regressions pass. Wooden ruler segments are unchanged.

### Fixed
- **The chalk bank line was not a real shot.** With the old rails every bank came off at least 15° flatter than the
  mirror line the hint draws, and none of 336 test balls sent along it went in; now every one that reaches the goal
  line scores (116 of 336; the rest run out of pace).
- **Kwame's bank lesson could not be completed**: no aim from the lesson cap banked in at any power, and only the
  three-miss rule moved players on. A firm flick straight through the ball now banks in, with about 6° of aim to
  spare.

## 2026-09-24 — First-launch walkthrough, camera cues and pause settings

### Added
- **First launch**: until Kwame's Corner is finished or skipped, the big title button is **Learn with Kwame**
  (2-minute practice), with **I know how to play: just play** beneath it. Either choice is remembered.
- **Camera cues**: the Camera button shows a drawn icon of the current view and its C key; the camera panel lists
  each view with its icon, what it is for, and its key (1, 2, 3) on keyboard devices; switching views flashes
  "Now: Street Level · 3" for a moment.
- **Pause menu**: Camera view (steps through all four), Show tips again (the one-time chalk hints come back),
  and How to play · Kwame's Corner.

## 2026-09-24 — Kwame's Corner practice table

### Added
- **Practice with Kwame** on the title screen: a solo Schoolyard table where Kwame walks you through six short
  lessons: pick a cap and pull back, flick into the ball, knock the ball into his chalk ring, bank one off the
  rail past his blocking cap into the goal, hold Tactical peek, and switch to Street view. His line sits in a
  card under the scoreboard; the ring and the bank path are chalked on the table; a miss resets the table, and
  after three misses he lets it go and moves on. No flick limit and no score. Finishing returns to the title
  screen and is remembered; Quit to Home leaves at any time. The one-time chalk hints stay out of practice.

## 2026-09-24 — In-match chalk hints

### Added
- Three hints that teach at the moment they help, once each (remembered on the device), only on your own turn
  while aiming, and gone as soon as you flick:
  - **Bank it off the rail**: when the straight line from the ball to goal is blocked but a one-rail bank is clean,
    a solid chalk line shows the bank path.
  - **Get low: Street view**: when the flick you're aiming will run into a pot, booth or coin stack.
  - **Hold Tactical peek**: when one of your caps is hidden behind another piece from the current camera; the
    Tactical peek button glows.

## 2026-09-24 — One-piece aim arrow

### Changed
- The aim arrow is one piece: a ring round the chosen cap and a single band growing straight out of it.
  The separate gold notch, the inner gold strip, the red max-power rim and the second shadow ring are gone,
  so the see-through layers no longer read as dashes or stripes. Power now warms the ring and the band
  together from ivory to gold, on top of the band's length and width.

## 2026-09-24 — Lighter aim arrow

### Changed
- The aim arrow keeps its shape but is slimmer and slightly see-through: at full power it is 26px wide on a
  phone (was 52px) and 21px with a mouse (was 42px). The ivory band, gold core, rim, rings and shadows are all
  lighter, so the table and the pieces show through and it no longer covers the pitch on small screens.

## 2026-09-23 — Broadcast shows both goals

### Changed
- Broadcast no longer zooms past the goals and slides with the ball: it is a fixed side-on view fitted as
  tight as the screen allows around both goals (the lorries on lorry acts) and the table's full width. It
  uses the lowest angle, from about 27°, at which the table also fills the screen's height, so wide screens
  get the low TV angle and squarer windows a steeper view instead of empty room.

## 2026-09-23 — Props fade when close to the camera

### Added
- Tall props on the table (clay pots, toll booths and booms, coin stacks, goal frames, lorries) thin out where
  they come close to the match camera, so a low Street or Broadcast view is never walled off by the nearest
  prop. Props next to the action stay solid; caps, ball, rails and the table surface never fade. Replays and
  goal cameras show everything solid.

## 2026-09-23 — Street Level checked on every Street Legends table

### Fixed
- Harmattan Haze: Street Level always keeps the goal lorry in view (it moves between stops, and it is what you
  aim at); before, the lorry sat under the scoreboard's objective line.
- Every camera now keeps the table clear of where the scoreboard and its objective line really end on screen.
  On acts whose objective runs to three lines, the fixed reserve used to let it cover the far goal.

## 2026-09-23 — Closer Street Level camera

### Changed
- Street Level is a low (about 27°) close shot of the shot itself: your cap, the ball and the next metre of the
  way to goal, clear of the scoreboard. It no longer backs off to fit your own end of the table, so it sits
  about 58% closer in open play (1.9 units from the action instead of 4.5) and your own goal leaves the frame.

## 2026-09-23 — Table square to the screen

### Fixed
- Tactical, Broadcast and the Free starting view no longer show the table slanted. Their camera directions
  had small sideways offsets that rolled or skewed the table 3–11° on screen; the rails now run parallel to the
  screen edges. Street keeps its deliberate three-quarter angle.

## 2026-09-23 — Preview server that never serves stale code

### Changed
- Local preview now runs `node scripts/dev-static-server-no-cache.mjs 4180` instead of Python's
  `http.server`. Every response is `Cache-Control: no-store`, so a normal browser refresh always loads the
  latest game modules (Python's server let the browser keep old camera code after changes).

## 2026-09-23 — Calm camera at turn changes

### Fixed
- Street camera no longer swings round to the computer's end on its turn and back again on yours: it stays
  behind your caps, holds still through the opponent's turn, and reframes only when your turn begins.
- Camera moves the game makes on its own (a new turn, the 2-Player hand-over, returning from a replay or the
  kick-off intro) glide over about a second instead of snapping in a quarter second. Buttons and Tactical
  peek still respond at once; reduced motion still cuts.

## 2026-09-23 — Broadcast camera that follows the ball

### Changed
- Broadcast (the default match camera) now works like a TV football camera: low and side-on, zoomed in
  until the table's full width fills the screen from just under the scoreboard to the bottom controls,
  sliding along the table to keep the ball centred and stopping at each goal end. The table fills the frame;
  the room is a thin band behind it. Portrait keeps the full width across the screen, from a steeper angle.
- Tactical still shows the whole table from above, and Free orbits at the whole-table distance.

## 2026-09-23 — Closer match camera

### Changed
- Broadcast and Tactical now frame the pitch (rail battens and goals), not the whole table and room: on
  laptops and desktops the rails fill about 85% of the screen width, up from 53–65%. Broadcast sits a little
  lower (about 35°) and the pitch is centred between the scoreboard and the bottom controls. Lorry acts still
  keep the lorries in view; HUD clearances are unchanged.

## 2026-09-23 — Keyboard shots, safer Restart/Quit, clearer table conditions

### Added
- **Keyboard shot:** arrows (or WASD) aim and set power, Q/E switch caps, Space/Enter flicks, Esc puts
  the cap down. A key guide appears while aiming; the first-shot tip mentions it on keyboard devices.

### Changed
- Restart and Quit need a second press once a flick has been played, so a mis-tap can't throw a match away.
- Street Legends conditions name the table's moving feature (ruler, dish, pots, booms, lorry, coin stacks)
  instead of "No fixed obstacles"; "1 fixed obstacle" is now singular.

### Fixed
- The chalk scoreboard no longer throws when the browser's font API returns nothing during a refresh.

## 2026-09-23 — KONK! branding

### Changed
- The game is now **KONK!**: the home screen shows the KONK! logo (the O is a crown cap striking
  the ball) with *Tiny pitch. Big moments.*; Street Legends is labelled as the featured mode,
  separate from the title. Tab title, description, favicon, phone home-screen icon, rotate prompt,
  share-card header and share messages all use the new name.
- Shared result and challenge links now show the key art as a link preview (Open Graph tags).
- The logo's ball is the game's own folded-paper ball (fold planes, creases, exercise-book ruling), not a football.
- Save keys, folder names and `window.__countersBall` are unchanged so existing progress is kept.

### Removed
- The old Counters Ball logo and favicon (`assets/counters-ball-*.svg`) and the hidden logo loader.
- The large red cap print on the home screen: it competed with the cap in the KONK! logo. (The share card still uses it faintly in a corner.)

## 2026-09-23 — Rivalry, share cards and challenge links

### Added
- **2-Player Table names and series:** type both players' names on the intro card; the
  scoreboard, turn banner and results use them. Games form a first-to-two-wins series
  (drawn games don't count), kick-off alternates, and a "PASS IT OVER" callout marks each
  hand-over. Results offer one-tap **Rematch** (straight to kick-off), then **New series**.
- **Head-to-head record** per pair of names, saved locally, shown on the intro and results.
- **Share** on every results card: a 1080² PNG card (score in team chalk, stars or series
  lines, cap print) through the phone's share sheet; desktop downloads it and copies the text.
- **"Beat me" links** from matches against the AI: the friend gets a challenge card, the same
  table (even if locked), their mark on the intro, and a verdict at full time.

## 2026-09-22 — Street Legends: Lights Out Final coin-stack chain

### Added
- **Coin-stack chain** at Jamestown, under the kiosk bulb (Street Legends): both goals are
  padlocked; strike your three coin stacks in beam order (ball or your own cap) to light the
  bulb and drop the padlock. The bulb goes out after every goal. Hero goals: LIGHTS ON,
  OFF THE COINS. All six Street Legends venues are now built (18 acts).
- Three acts: *Light the Bulb* (solo), *Magic's Table*, *Lights Out*. Magic plans the chain ahead.
- Physics: static bodies flagged `target` record per-flick strikes (`targetStruckFor`), cleared
  with the bank touches so AI rehearsals see them too.

## 2026-09-22 — Street Legends: Veranda Derby clay-pot maze

### Added
- **Clay-pot maze** at Auntie Ama's Veranda, Kumasi (Street Legends): three pots in each half
  (a big one guarding the goal mouth) and a no-straight-goals rule. A goal counts only if the
  ball bounced off a pot or the rail on that flick; straight goals are waved off ("NO BANK,
  NO GOAL"). Hero goals: OFF THE POT, DOUBLE POT, OFF THE RAIL.
- Three acts: *Auntie Ama's Rule* (solo), *Mind the Pots*, *The Derby*. Yaw looks for the bank.
  Pots are radius 0.13 (a wider bank face); Act 1 starts the ball beside the big pot.
- Physics: goal-line detection moved to `goal-line-crossing-detection.js`, with an optional
  `goalRequiresTouchOf` rule (kinds, incl. 'rail'), `onGoalDenied` hook and per-flick
  `bankedOff` tracking (real impacts only).

## 2026-09-22 — Street Legends: Kiosk Corner change dish

### Added
- **Change dish** at Nima Market Road (Street Legends): an enamel change tray on its edge
  around each goal mouth covers a 100° arc and turns one notch per attacker turn (open left →
  open edges → open right). Chalk marks the next notch. Hero goals: EXACT CHANGE, OFF THE DISH.
- Three acts: *Exact Change* (solo), *Rush at the Hatch*, *Closing Time*. Esi waits for the gap.
- `pushClearOfSegment` shared by turning venue pieces (dish and ruler sweep things aside).

### Changed
- Schoolyard ruler: the turn now sweeps caps aside too (cap pinning froze it on ~40% of turns);
  Act 1 starts the ball at (0.5, 0.42) with 10 flicks (78% win for the bot proxy, was ~38%).

## 2026-09-22 — Street Legends: Schoolyard Break ruler seesaw

### Added
- **Ruler seesaw** at Adabraka Primary (Street Legends): a 30 cm ruler on its edge in each half,
  pinned through an eraser, turns 45° each time its attacker starts a turn. Chalk shows the
  next angle. Whatever rests in its sweep is pushed aside as it turns. Hero goal: RULER BANK.
- Three acts: *Before the Bell* (solo), *Ruler Rules*, *Last Bell*. Kwame barely reads the ruler.
- Physics: static segment collider (`addStaticSegment`, `static-segment-collisions.js`) and
  dependency-free segment geometry (`segment-geometry-helpers.js`), cloned for AI rehearsal.

## 2026-09-22 — Street Legends: Harmattan Haze departing lorry

### Added
- **Departing-lorry goals** at Tamale Lorry Station (Street Legends): each goal rides a toy lorry
  along the end line through five stops, one stop per attacker turn, turning back at the far
  stops. A ghost goal shows the next stop. Hero goals: CAUGHT THE LORRY, LAST STOP!
- Three acts: *Catch the Lorry* (solo), *Loading Bay*, *Last Lorry to Bolgatanga*. Abdul
  chases where the lorry goes next.
- Street Legends now opens a list of every built venue's acts (Act 1 of each is always open).
- Venue-mechanic registry (`street-legends-venue-mechanic-wiring.js`): a mechanic is a
  factory returning view, turn step, HUD line, hero label and AI hooks.

### Changed
- Physics tracks a goal-mouth centre per end (`goalCenters`); the AI planner, slow-motion
  trigger and AI rehearsal clones use it. Classic venues keep both at 0.

## 2026-09-22 — Street Legends: Roadside toll gates

### Added
- **Street Legends mode** (title → Street Legends): a separate track layered on the
  real Roadside Showdown venue at Tema Motorway Junction. It has three acts: *Green
  Means Go* (solo), *Rush Hour* and *Last Toll Before the Motorway*. Classic
  Campaign and the 2-Player Table are unchanged.
- **Toll gates**: a toll plaza guards each goal approach, with two booths, three lanes
  and a red-and-white boom per lane. One boom is down, and each time that plaza's attacker
  starts a turn it steps left → centre → right → centre. Green means open, blinking
  amber means shuts on your next shot, red means down. Caps slide under the booms; the ball
  cannot. A boom cannot come down on the ball resting beneath it: it jams open.
  Booms move only between turns.
- Hero goals: THROUGH THE … TOLL, BOOM BANK and JAMMED THE GATE (each earns the replay).
- The AI reads the toll plazas: it aims through open lanes, parks a cap in the open lane
  the ball faces, sets up in front of lanes that stay open, and weights these by rival.
  Akosua plays as a "toll collector".
- Rules: optional `awayFlickLimit` (solo challenges). Levels: optional `awaySlots`
  and `ballStart`. Physics: static bodies can be `disabled` or `blocksOnly: 'ball'`.
- Toll canopy gantry behind the table; HUD objective line with the live signal.
- Design matrix for all six venues: `docs/street-legends-design-matrix.md`.

### Changed
- **Flick Vector**: a much thicker tapered ribbon (18–42 px desktop, 24–52 px touch),
  an arrowhead twice the shaft width, a dark outline for bright tables, a larger
  origin ring, and a gold core from 30% power.
- Removed chickens from the shared venue compositions; guinea fowl remain only
  at Tamale Lorry Station, where they belong.

## 2026-09-22 - Venue Identity and Flick Vector

- Added seeded venue-specific surfaces, wear/roughness, markings, support/rail/
  goal construction and safe outer silhouettes; gameplay bounds remain unchanged.
- Added layered venue architecture, restrained ambient motion, six establishing
  openings and licensed-photo grading controls (photographs disabled by default).
- Replaced dashed aiming with a grounded selection ring, broad tapered vector,
  projected mobile sizing, approximate first-contact ghost and immediate release
  flash/scrape. Human aim locks the camera until release or cancellation.
- Verified 90 tests, six UI-hidden venue captures, six opening views and phone
  aiming at four widths. See `venue-flick-vector-verification.md` for limitations.

## 2026-09-17 — Broadcast sport and Flick Craft

### Added
- Selected-venue Circuit hero over procedural scenery, six preview stops with
  campaign lock enforcement, broadcast intros/results, compact HUD, persistent
  turn ownership, one-shot low-flick attention and elapsed-time priority callouts.
- Gesture speed/stability sampling with bounded aligned-draw boost; contact-based
  Sweet Spot, Bank, Counter and Street Play recognition. Heat affects presentation
  only; skill rewards do not alter physics or campaign star saves.
- Timestamp-bounded transform replay with skippable 2–4 second playback and
  restored live meshes. Playback never re-scores; paused restoration defers rule
  continuation until resume. Camera-motion control respects reduced motion.
- Semantic procedural audio, transient voice cap of 32, Heat ambience intensity
  and match-point tension ducking.
- Default-off licensed same-origin distant-photo configuration with horizon,
  crop, grading, haze and parallax; procedural fallback and resource cleanup.

### Changed
- Presentation clock freezes with pause. Coarse-pointer sun shadows use 2048²
  instead of 4096²; desktop retains 4096². Existing no-build architecture remains.

### Verification
- Deterministic implementation tests are present; additional tests are underway.
  Local preview at `http://localhost:4181` serves HTTP 200.
- Admin policy prevented automated browser inspection. No claim of verified
  screenshots, mobile layout/touch, console cleanliness or GPU/performance.

## 2026-09-17 — Mobile

### Added
- Portrait framing: on tall screens the view turns a quarter so the pitch runs
  up the screen and you attack upward; the table is ~54% bigger on a phone.

### Changed
- Touch aiming: a tap within 24 px grabs the nearest cap, the pull is measured
  from the finger, and the aim projection is frozen for the gesture so camera
  drift cannot change shot power. Cancel, lost capture, blur and resize abort a
  drag without spending a flick. Compact HUD for narrow and landscape phones.

## 2026-09-17 — Venue environments

### Added
- Realistic, place-true surroundings for all six pitches: painted ground per
  venue (playground hopscotch, laterite, polished red veranda floor, roadside
  gutter and asphalt, lorry-station sand, Jamestown concrete), true-scale ground
  props, building fronts with hand-painted signs, wandering chickens and guinea
  fowl that scatter on goals, swaying leaf shade, harmattan dust banks, and a
  night bulb and kiosk hatch that flicker on the same circuit.
- Depth of field with a sharp zone: the pitch stays crisp, the street blurs.

### Changed
- Sun shadows now cover the street around the table (±7.5 units, 4096² map).
- Old blurred-plane backdrop, tint and glow-sprite presets removed.

## 2026-09-11 — Campaign, interface and game feel

Turned the visual-direction prototype into a playable game.

### Added
- **Logo & brand**: crown-cap badge with the Black Star, chalk flick-streaks and
  a sticker wordmark (`assets/counters-ball-logo.svg`), animated on the title
  screen; matching favicon.
- **Six-venue campaign** (`src/levels/`): schoolyard, kiosk, veranda, roadside,
  harmattan lorry station, night final — each with its own surface, lighting
  preset, backdrop, obstacles, rules and opponent kid.
- **AI opponent** (`ai-opponent-shot-planner.js`): plans by rehearsal on a
  cloned physics table (ghost-ball aims, clearances, random samples scored by
  simulated outcome). Five difficulties from `rookie` to `champion`, separated by
  search budget, aiming error and blunder chance. The performer scans the caps,
  draws back and flicks so it reads like a person.
- **Match rules**: turn order, per-side flick budgets, goals-to-win, kickoffs,
  full-time results and three stars (win · clean sheet · win within budget).
- **Progression**: stars and sound preference in localStorage; venues unlock in
  order; 2-player hot-seat mode on any table.
- **Interface**: title with live AI-vs-AI attract match, level select, intro
  card, in-match HUD, pause menu, results card with stars revealed one by one,
  and a looping chalk hand that teaches the drag on level 1.
- **Game feel**: hit-stop on strikes, slow motion on shots at goal, spring
  squash/lean/wobble on caps and goals, ball hop, dust puffs, ball dust trail,
  goal confetti that settles on the table, camera director (attract / crane-in
  intro / breathing play / goal push-in) with flick kicks and trauma shake.
- **Audio**: fully procedural Web Audio — cap clinks, paper thwacks, wood
  knocks, stone clacks, glass tinks, pea whistle, crowd swell, star dings, plus
  day/harmattan/night ambience beds.

### Changed
- `src/` reorganised into `core/ levels/ scene/ gameplay/ fx/ audio/ ui/`.
- Physics moved to a fixed 240 Hz step with impact/wall events, friction scaling
  per venue and snapshot/clone support so AI rehearsal matches real play.
- Table surfaces generalised from cardboard-only to cardboard, plywood and a
  carved school desk; backdrops and lighting are now per-venue presets.
- Aim visuals extracted so the human input and the AI share one presentation.

### Fixed
- Boot crash: the first animation frame could produce a negative `dt`, sending
  the thinking AI's cap-scan index to -1 (`TypeError` on `.body`). `dt` is now
  clamped at 0 and the scan timer can't go negative.
- Physics: caps pushed together could come to rest interpenetrating and stay
  that way, because resting pairs skipped the overlap test. Overlap is now
  checked first (squared distance, so it stays cheap).
- Leaving the results screen early no longer lets pending star-reveal sounds
  fire into the next screen.
- The title-screen AI match restarts itself if it ever runs out of flicks
  instead of freezing.
- AI fallback shot now uses the cap nearest the ball; light shadow maps are
  disposed explicitly on venue change.
- Pointer capture and single-pointer ownership (a second touch can no longer
  hijack a drag).
- Swept goal-line test replaces the positional check (no tunnelling at speed).
- Pixel ratio refreshed on resize; dust sprite texture shared.
