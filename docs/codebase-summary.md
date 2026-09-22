# Codebase Summary

No build step. ES modules + import map, Three.js r160 from CDN, served statically.
Default assets remain runtime-generated. Licensed, same-origin distant photographs
are optional and disabled by default; missing images leave procedural scenery intact.

## Boot and flow
`index.html` holds every screen as static markup; `src/main.js` wires it up.

```
main.js
 ├─ createRendererSceneCamera ──► persistent renderer / scene / camera
 ├─ createPostProcessing ───────► bloom → output → grain/haze
 ├─ CameraDirector ─────────────► attract | intro | play | goal
 ├─ ProceduralSoundBoard ───────► sfx + ambience beds
 ├─ MenuScreens / MatchHud ─────► DOM screens, delegated [data-action] clicks
 └─ MatchSession (one per venue) ► built, disposed and replaced per match
```

App states: title (live AI-vs-AI attract match) → Circuit venue preview →
skippable, automatically advancing intro → match → results. Progress lives in
localStorage. Circuit previews replace the venue without starting a match;
locked venues can be previewed but cannot be entered in campaign mode.
`core/game-render-loop-and-viewport.js` owns rendering, resize and motion preferences.

## MatchSession (`src/gameplay/match-session-runtime.js`)
Owns everything venue-specific and disposes it cleanly:

| Piece | Role |
|---|---|
| `buildLevelStage` | Lights, table, caps, ball, goals, obstacles, backdrop in one Group |
| `FlickPhysicsEngine` | Fixed 1/240 s circle physics; impact/wall/goal events |
| `MatchRules` | Turns, flick budgets, goals, kickoffs, result + stars |
| `HumanDragAimInput` / `AiTurnPerformer` | The two ways a flick happens |
| `AimVisuals` | Origin ring, projected ribbon/head, first-contact ghost and release scrape; shared by human and AI |
| `JuiceAnimator`, `ImpactParticles`, `GameTimeController` | Feel: springs, dust, hit-stop |
| `wireMatchFeedback` | Maps engine + rules events onto sound, fx, camera, HUD |
| `MatchPresentationDirector` | Skill recognition, Heat, match point and replay lifecycle |
| `CompactTransformReplay` | Bounded timestamped mesh history; never re-simulates goals |

`update(realDt)` first checks pause/disposal, then advances presentation. Replay
short-circuits simulation. Otherwise: timers → game time → physics → rest check →
mesh sync → AI → juice → replay capture → particles → aim → backdrop → camera focus.

## Presentation contracts
- `MenuScreens.previewLevel(level, index, unlocked, mode)` fills the hero and
  selected route state. `preview-level` selects scenery; `select-level` enters.
- `MatchHud.event(label, {direction, priority, duration})` uses one prioritized
  callout lane. `update(dt)` advances it; `clearEvents()` clears callout/replay UI.
  `setHeat(home, away)` accepts 0..1; `replay(active, label)` controls the skip UI.
- `FlickGestureSampler` measures recent draw speed/stability, with an aligned
  draw boost capped at 8%. `SkillPlayEventTracker` observes real contacts for
  Sweet Spot, productive Bank, defensive Counter and successful Street Play.
  Skill rewards and Heat are presentation-only; neither writes physics state.
- Replay holds up to three seconds at a target 30 samples/s in typed arrays,
  evicts by timestamp as well as capacity, and plays for 2–4 seconds. Skip/end
  restores live transforms and exits replay camera mode. If restoration happens
  while paused, rules continue only after resume; scoring is never replayed.
- Camera motion can be disabled; reduced motion disables it and ends an active
  replay. Presentation clocks freeze during pause.
- Semantic procedural audio uses a 32-source transient voice cap, node cleanup,
  Heat ambience gain and match-point tension ducking. Ambience has separate nodes.
- Coarse-pointer devices use 2048² sun shadows; other devices use 4096².

## Conventions
- Physics space is 2D: `Vector2.x` = world x, `Vector2.y` = world z. The third
  dimension is presentation only (cap squash, ball hop, goal wobble).
- All contact feedback is driven by one **strength 0..1** derived from impulse,
  so a paper ball and a steel cap scale the same way.
- Every module is one concern, kebab-case and self-describing; files stay under
  ~200 lines.
- Randomness is seeded per venue (`createSeededRandom`) so wear is identical on
  every load; only gameplay noise (AI error, particles) uses `Math.random`.
- Anything that must pause with the game uses `session.schedule()`, never
  `setTimeout`.

## Extending
- **New venue**: add an entry to `CAMPAIGN_LEVELS` (surface, lighting preset,
  backdrop key, obstacles, rules, opponent). No other file needs to change.
- **New lighting**: add a preset to `LIGHTING_PRESETS`; it carries exposure, fog,
  haze, grain and an optional bulb.
- **New venue surroundings**: add an entry to `VENUE_ENVIRONMENTS`
  (`src/scene/environment/venue-environment-compositions.js`): ground painter,
  wall features, props `[builder, x, z, rotation, options]`, animals, shade, dust.
  Keep bulky props at z ≤ -4.6 and animals at z ≤ -4.0 so they stay soft behind the table.
- **New obstacle**: add a builder + radius in
  `table-obstacles-pebbles-bottles-coins.js`; physics and AI handle it for free.
- **New difficulty**: add an entry to `AI_DIFFICULTY` (search budget, aim noise,
  blunder chance).
- **Street Legends venue mechanic**: acts live in `src/levels/street-legends-*.js`
  (spread the real campaign venue, add `mechanic`, `objective`, `introLines`, `legend`,
  optional `rules.awayFlickLimit` and `awaySlots`). `createVenueMechanic(session)`
  in `street-legends-venue-mechanic-wiring.js` returns the session's `mechanic`:
  `update`, `busy` (locks human input), `observe(ball)`, `noteImpact`, `goalLabel`,
  `aiCandidates(side)`, `aiScore(sim, side, ballIndex)`. It is created before
  `wireMatchFeedback`, so the signal steps before the AI plans. State changes only
  between turns. Raised booms use `body.disabled` on static circles.
- **Licensed photographs**: configure `LOCATION_PHOTOGRAPHS` in
  `scene/environment/location-photograph-configuration.js`; supply a root-relative
  same-origin path, credit and license before enabling a venue. Parameters cover
  horizon, focal crop, exposure, grade, haze, parallax and plane placement.

## Verification status
The venue/Flick Vector pass has 90 passing tests and browser captures of all six
venues/openings and aiming at 320/375/390/430 widths. Port 4181 is the preview.
See `venue-flick-vector-verification.md` for evidence and remaining independent
review, console-diagnostic and physical-device checks.
