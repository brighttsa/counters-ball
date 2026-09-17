# Project Changelog

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
