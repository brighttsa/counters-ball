# Counters Ball 3D — Campaign, UI & Game Feel

## Overview
Turn the visual-direction prototype into a game: logo + title flow, 6-venue
campaign vs AI kids, star progression, AAA-style feedback (hit-stop, springs,
particles, procedural audio, directed camera). Stays no-build, zero binary assets.

## Status
- [x] Phase 1 — Restructure `src/` into core/levels/scene/gameplay/fx/audio/ui
- [x] Phase 2 — Logo (SVG crown-cap badge, Ghana palette) + favicon
- [x] Phase 3 — Level data: 6 venues, surfaces, lighting presets, backdrops, obstacles, rules
- [x] Phase 4 — Stage builder + disposal (per-level scene graph, wood/cardboard surfaces)
- [x] Phase 5 — Physics: fixed-step, impact events, snapshot/clone for simulation
- [x] Phase 6 — Match rules (turns, flick limits, goals-to-win, stars) + AI planner (simulation search) + AI performer
- [x] Phase 7 — Game feel: juice springs, dust/confetti, hit-stop & slow-mo, camera director, audio
- [x] Phase 8 — UI: title (AI-vs-AI attract), level select, intro card, HUD, tutorial hand, pause, results
- [x] Phase 9 — Browser verification, code review, docs

## Key decisions
- AI = brute-force forward simulation of candidate flicks on a cloned engine
  (ghost-ball aims + random samples), scored by goal/territory/danger; difficulty
  = sample budget + execution noise + blunder chance. Handles obstacles & banks for free.
- Fixed 240 Hz physics step so AI simulations match real play.
- Title screen runs a live AI-vs-AI match behind the menu (attract mode).
- Timers run on game time (session scheduler), so pause freezes everything.
- Stars: win · clean sheet · win within N flicks. Progress in localStorage (try/catch).

## Levels
| # | Venue | Surface | Light | Obstacles | Rule | AI |
|---|---|---|---|---|---|---|
| 1 | Schoolyard Break | cardboard | midday | — | first to 1 | rookie |
| 2 | Kiosk Corner | cardboard | late afternoon | — | first to 2 | easy |
| 3 | Veranda Derby | plywood | golden hour | 2 pebbles | first to 2 | medium |
| 4 | Roadside Showdown | plywood | late afternoon | bottle + coins | first to 3 | medium |
| 5 | Harmattan Haze | dusty cardboard | harmattan | 3 pebbles, +35% friction | first to 2 | hard |
| 6 | Lights Out Final | school desk | night bulb | 2 bottles + coins | first to 3 | champion |

## Verified in browser (2026-09-12)
Zero console errors throughout. Title + attract match, level select (locks and
stars), intro card, HUD, night venue, pause via Escape, 2-player mode.
- Human drag-flick: pull 0.538, power ring + trajectory shown, flick registered.
- AI turn: plans, draws back, flicks — and blundered an own goal at `rookie`
  aim noise, which is in character.
- Goal → celebration (180 confetti, camera push-in) → end → results card,
  3 stars revealed, `{"stars":{"schoolyard":3}}` persisted, pitch 2 unlocked.
- Multi-goal venue: kickoff resets ball to centre, caps home, confetti cleared,
  turn to the conceding side.
- Versus results: stars and Next Pitch hidden, no stars written.
- Disposal: GPU geometry/texture counts flat across 8 venue switches.

Note: with the Browser pane hidden, `requestAnimationFrame` throttles to ~1 fps,
so physics, the rest-check and pausable timers nearly freeze and the game looks
stuck. Verification drove `session.update(1/60, t)` directly instead. Browser
behaviour, not a game defect.
