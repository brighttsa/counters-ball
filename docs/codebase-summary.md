# Codebase Summary

No build step. ES modules + import map, Three.js r160 from CDN, served statically.
Zero binary assets: textures, sounds and sprites are generated at runtime.

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

App states: title (live AI-vs-AI attract match behind the menu) → level select →
intro card + camera flyover → match → results. Progress lives in localStorage.

## MatchSession (`src/gameplay/match-session-runtime.js`)
Owns everything venue-specific and disposes it cleanly:

| Piece | Role |
|---|---|
| `buildLevelStage` | Lights, table, caps, ball, goals, obstacles, backdrop in one Group |
| `FlickPhysicsEngine` | Fixed 1/240 s circle physics; impact/wall/goal events |
| `MatchRules` | Turns, flick budgets, goals, kickoffs, result + stars |
| `HumanDragAimInput` / `AiTurnPerformer` | The two ways a flick happens |
| `AimVisuals` | Trajectory, power ring, rim glow — shared by human and AI |
| `JuiceAnimator`, `ImpactParticles`, `GameTimeController` | Feel: springs, dust, hit-stop |
| `wireMatchFeedback` | Maps engine + rules events onto sound, fx, camera, HUD |

`update(realDt)` order: timers → game time (hit-stop/slow-mo) → physics →
rest check → mesh sync → AI → juice → particles → aim visuals → backdrop →
camera focus.

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
  haze, grain, tint and optional bulb.
- **New obstacle**: add a builder + radius in
  `table-obstacles-pebbles-bottles-coins.js`; physics and AI handle it for free.
- **New difficulty**: add an entry to `AI_DIFFICULTY` (search budget, aim noise,
  blunder chance).
