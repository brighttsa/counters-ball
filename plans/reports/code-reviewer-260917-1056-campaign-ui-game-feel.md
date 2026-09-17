# Code Review — Campaign Levels, UI & Game Feel

Plan: `plans/260911-1400-campaign-levels-ui-and-game-feel/plan.md`
Scope: static read-only review of the full new/rewritten feature (~3300 LOC across core/levels/scene/gameplay/fx/audio/ui). No server started, no files modified.

In-browser verification already done by the team and taken as given (not re-checked): human flick, AI turn, goal→results, star persistence, kickoff reset on multi-goal venues, versus mode, pause, GPU memory flat across 8 venue switches.

## Ranked Findings

### 1. [Major] Resting-pair collision skip can leave bodies permanently interpenetrating
`src/gameplay/flick-physics-engine.js:94`
```js
if (a.vel.x === 0 && a.vel.y === 0 && b.vel.x === 0 && b.vel.y === 0) continue;
```
This early-exit skips both the positional-correction (`push`) and the impulse response whenever *both* bodies in a pair are at rest — before checking whether they actually overlap. Normally this is safe because a pair that collided while moving gets pushed to exactly `dist === minDist` (no residual overlap) by the same function. It breaks for 3+ body clusters resolved within a single frame: pair (A,B) is corrected first and A is *pushed* (position only, no velocity added) into overlap with C; if A and C both already have `vel = (0,0)` at that point (e.g. both had just decayed under friction to `REST_SPEED`), the (A,C) pair is skipped for the rest of the simulation — the overlap is never corrected on any subsequent frame, since the skip re-triggers every frame it is checked. Caps clustered near a post/pebble/other resting caps (common in the goal mouth, or around obstacles on venues 3–6) can end up visibly clipped into each other or into a static obstacle indefinitely, and the AI's `simulateUntilRest` clone inherits the same bug, so simulated outcomes for clustered shots can be slightly wrong.

**Fix:** don't gate on velocity before checking overlap. Keep the optimisation for skipping impulse math (which is legitimately near-zero when both are resting) but always run the overlap/positional-correction branch:
```js
let nx = b.pos.x - a.pos.x, nz = b.pos.y - a.pos.y;
const dist = Math.hypot(nx, nz), minDist = a.radius + b.radius;
if (dist >= minDist || dist === 0) continue;
nx /= dist; nz /= dist;
const push = (minDist - dist) / totalInv;
a.pos.x -= nx * push * a.invMass; a.pos.y -= nz * push * a.invMass;
b.pos.x += nx * push * b.invMass; b.pos.y += nz * push * b.invMass;
if (a.vel.x === 0 && a.vel.y === 0 && b.vel.x === 0 && b.vel.y === 0) continue; // now safe: only skips impulse
```

### 2. [Major] Results-screen star-reveal timers keep firing after leaving results early
`src/ui/ui-match-hud-pause-and-results.js:82-113`, consumed from `src/main.js:88-100,109-129`
`fillResults()` schedules `setTimeout`s (650ms + i·450ms real wall-clock) to reveal each star and call `onStar(i)` → `sound.starDing(i)`. `this.resultTimers` is only cleared at the *top* of the next `fillResults()` call — never when the player leaves the results screen. If the player taps "Replay" / "Next Pitch" / "Pitches" within ~1.5s of the results screen appearing (very plausible — buttons are live immediately), the pending timers still fire later: `list.children[i].classList.add('earned')` mutates a hidden/gone screen (harmless) but `onStar(i)` still calls `sound.starDing(i)`, i.e. an unexpected "ding" plays during the intro card or the next live match with no visual cause. This is a real, easily-reachable UI/state-sync bug matching the review's "state/UI sync" and "replay" focus.

**Fix:** cancel pending result timers whenever a new session/screen is entered. Cheapest fix: clear them inside `replaceSession()` in `main.js` (covers `prepareMatch` → restart/replay/next-level/select-level, and `ensureAttractMode` → results-levels/quit/back-to-title, since both paths call `replaceSession`):
```js
function replaceSession(options, sessionHud) {
  app.session?.dispose();
  hud.cancelResultTimers?.(); // add MatchHud.cancelResultTimers() = resultTimers.forEach(clearTimeout); resultTimers=[]
  ...
}
```

### 3. [Minor] AI fallback shot doesn't pick the "nearest cap" the comment claims
`src/gameplay/ai-opponent-turn-performer.js:38-41`
```js
if (!plan) { // defensive fallback: poke the nearest cap at the ball
  const body = entries[0].body;
  ...
}
```
`entries[0]` is always the first entry in team order, which is the keeper (`TEAM_FORMATION[0]`, the deepest defender) — not necessarily the nearest cap to the ball. In practice this path is close to dead code: `candidateShots()` always adds `difficulty.randomSamples` unit-vector samples (≥3 even for `rookie`) regardless of geometry, so `evaluated` is essentially never empty and `planAiShot` only returns `null` when actually cancelled (in which case `takeTurn` already bails via the token check before reaching this branch). Low real-world impact today, but the comment is misleading and the code is one difficulty-table typo (`randomSamples: 0`) away from flicking the keeper across the whole pitch. Either implement an actual nearest-cap lookup (`entries.reduce(...)` by `body.pos.distanceTo(ballBody.pos)`) or fix the comment to describe what the code does.

### 4. [Minor] Attract-mode match can permanently end and never restart
`src/levels/campaign-level-definitions.js:87-92`, `src/gameplay/match-rules-turns-goals-and-results.js:99-118`, `src/gameplay/match-session-feedback-hooks.js:96-102`, `src/main.js:35-47`
`ATTRACT_MODE_LEVEL` uses `flickLimit: 999` (per side) so the title-screen AI-vs-AI match is *practically* endless, but `MatchRules.passTurnTo` still calls `end()` once both sides exhaust their flicks. If the title screen is left running long enough (worst case a couple of hours of idle browsing, since each AI turn takes ~0.5–3s), `rules.end()` fires; `wireMatchFeedback`'s `'end'` handler cancels AI/input and sets `hud.setTurn(null, 'Full time!')` (harmlessly absorbed by `silentHud`), but nothing ever creates a new attract session — `ensureAttractMode()` only rebuilds when `app.session` is missing or not attract, and the ended session's `options.isAttract` is still `true`, so its guard short-circuits forever. The title/level-select background scene then sits frozen behind the menus indefinitely (recoverable only by reload). Low likelihood, but a genuine unbounded-idle edge case explicitly worth flagging.

**Fix:** in `wireMatchFeedback`'s `'end'` handler, special-case attract mode to loop instead of truly ending, e.g. `if (options.isAttract) { session.schedule(1, () => { rules.reset(); session.resetToKickoff(); rules.start(SIDE_HOME); }); return; }` before the normal end-of-match flow.

### 5. [Minor] `disposeObject3D` relies on a `Light.dispose()` that likely doesn't exist
`src/scene/level-stage-builder-and-disposal.js:52`
```js
if (obj.isLight) obj.dispose?.();
```
In three.js, shadow-map render targets live on `light.shadow`, and it is `LightShadow.prototype.dispose()` (not `Light.prototype.dispose`) that frees them; base `Light`/`DirectionalLight`/`SpotLight` don't define their own `dispose()` in r160, so `obj.dispose?.()` is effectively a silent no-op for every light here (sun, fill, hemi, night bulb — sun and bulb both have `castShadow = true`). The team's own measurement (GPU flat across 8 venue switches) says this isn't manifesting as a leak today, so I'm not calling it critical, but the code doesn't do what its shape implies, and it's one three.js minor-version nuance away from becoming a real leak (6 venues × repeated restart/replay/level-browsing all rebuild lights every time). Prefer being explicit and version-independent:
```js
if (obj.isLight) { obj.shadow?.dispose?.(); obj.dispose?.(); }
```

### 6. [Minor] AI shot planning keeps running briefly after cancel/dispose
`src/gameplay/ai-opponent-shot-planner.js:96-100`, `src/gameplay/ai-opponent-turn-performer.js`
`planAiShot`'s cancellation check only runs every `SIMS_PER_FRAME` (6) candidate simulations, driven by `requestAnimationFrame` independent of the owning `MatchSession`'s pause/dispose state. Quitting/restarting mid-AI-think lets the stale plan keep simulating on its cloned physics engine for up to ~dozens of extra rAF frames (worst case, champion difficulty: ~200 candidate shots / 6 per yield ≈ 34 frames) before it notices `isCancelled()` and bails. It never touches GPU/DOM state (the clone is plain JS objects), so this is not a correctness bug — just wasted CPU right after the player backs out of a match. Consider checking the token every simulated shot instead of every 6, or lowering `SIMS_PER_FRAME` for higher difficulties, if this shows up in profiling.

## Positive Observations
- Physics/rules/rendering separation is clean; `MatchRules` is a pure FSM with zero DOM/Three coupling, easy to reason about and test.
- `cloneForSimulation`/`snapshot`/`restore` correctly preserve body order and Vector2 identity (no aliasing), so AI `indexOf` mapping between the live and cloned engines is sound as long as nothing mutates `physics.bodies` mid-session (confirmed true — bodies are only ever repositioned, never re-added).
- Turn-token cancellation in `AiTurnPerformer` is correctly race-free: every `takeTurn` bumps the token synchronously before any `await`, and both post-await checkpoints re-validate it, so only the most recent call can ever reach `this.anim = {...}`.
- Swept goal detection (`resolveWalls`) correctly uses the post-collision, pre-wall-bounce position and a proper interpolated crossing point; `goalCooldown` fully guards against double-counting a goal while the ball rattles in the goal pocket before the next kickoff reset.
- GPU disposal for geometries/materials/textures is done generically by traversal + `Object.values(material)` scanning (catches `map`, `bumpMap`, shader uniforms, etc.) with a `seenMaterials` dedup set for shared materials — a solid, low-maintenance pattern that will keep working as new meshes are added to a level's group.
- `MatchRules.passTurnTo`'s "preferred, else fallback, else end" logic correctly handles the asymmetric-flicks-remaining cases (goal scored on the last flick of a nearly-exhausted side, one side running out before the other) without special-casing them.

## Quality Score: 8/10
Well-architected, consistent naming/module boundaries, and the lifecycle discipline (dispose ordering, token-based AI cancellation, traversal-based GPU cleanup) is well above average for a from-scratch game prototype. Docked for one real physics correctness bug in a focus area the team explicitly flagged as risky (#1), one reachable UI bug with an audible symptom (#2), and a small cluster of low-probability-but-real edge cases (#3–6) that are cheap to fix.

## Metrics
- Files reviewed: 24 of 32 source files (all of core/, gameplay/, most of scene/ and fx/, both audio/ files, both ui/ files, main.js, index.html); skipped `chalk-pitch-markings.js` (pure canvas painting, called once at build time, low risk) for token budget.
- Lines analyzed: ~3300 LOC total in `src/`, the above covers roughly 2800 of them.
- Type coverage: n/a (plain JS, no TypeScript).
- Test coverage: n/a (no automated suite, per review scope — intentionally out of scope).
- Linting issues found: none structural; no syntax/compile errors observed in any reviewed file.

**Status:** DONE_WITH_CONCERNS
**Summary:** Architecture and lifecycle discipline are solid; found one real physics correctness bug (resting-pair collision skip can leave clustered bodies permanently interpenetrating) and one reachable UI bug (results star-reveal timers can fire during a later screen/match), plus four lower-severity edge cases. Nothing blocks shipping, but #1 and #2 are worth fixing before calling Phase 9 closed.

## Unresolved Questions
- Was GPU memory measured via `renderer.info.memory` (geometries/textures counts) or actual browser process memory? If only `renderer.info.memory`, that wouldn't surface an un-disposed shadow-map render target (finding #5) since those aren't counted there — worth double-checking with the browser task manager or `chrome://gpu` if #5 is to be fully ruled out rather than just deprioritized.
- Is there a target play-session length for the title-screen attract mode (finding #4)? If the title screen is expected to run unattended for demo/kiosk purposes, #4 should be bumped to major.
