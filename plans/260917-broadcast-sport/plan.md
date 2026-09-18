---
title: Counters Ball broadcast sport and Flick Craft
status: in-progress
priority: P1
effort: large
branch: codex/workspace
tags: [gameplay, presentation, accessibility]
created: 2026-09-17
---

# Implementation Plan

User brief authorizes audit, a short internal plan, then implementation in focused commits.

## Contract
Extend the existing no-build game into a broadcast street sport. Preserve six venue IDs,
campaign stars/save format, AI simulation, hot-seat, fixed-step collision rules, generated
assets, sound controls and reduced motion. No frameworks, random skill rewards, hidden
physics bonuses, scraped photography, online accounts, or paid mechanics.

## Audit
main.js owns navigation; MatchSession owns live simulation and pausable timers.
Physics reports impacts/walls/goals, rules report turns/flicks/results, and feedback hooks
bridge presentation. HumanDragAimInput owns pointer capture and frozen drag projection.
CameraDirector, JuiceAnimator, ImpactParticles and ProceduralSoundBoard already provide
force-scaled response. MenuScreens and MatchHud own static markup. Six venue composers
provide worn procedural foreground/midground. Stars remain the only persistent reward.

## Phases
- [ ] A: Pure skill-event classifier, deterministic gesture metadata and tuning; tests.
- [ ] B: Broadcast HUD/circuit/intro/results, reusable callouts, readable accessibility.
- [ ] C: Damped camera, compact transform replay with skip and safe restoration.
- [ ] D: Semantic procedural audio, venue ambience and optional photography fallback.
- [ ] E: Integrate session lifecycle, regression tests, review, focused commits and handoff.

## Acceptance
Sweet Spot requires aligned useful cap-ball contact; banks require productive wall play;
Counter requires defensive reversal; Street Play requires a successful multi-contact goal.
Heat never changes physics. Cancelled input consumes no flick. Presentation uses game
time; pause freezes replay and callouts. Replay never re-simulates scoring and restores
transforms/camera before continuation. Route respects unlocks and hot-seat access.
Photo failures leave the procedural venue intact and resources dispose on venue changes.
Validate campaign, AI, hot-seat, goals/results, pause/restart, save compatibility and
all local module references. Target 320px, 390px, tablet, desktop and reduced motion.

## Verification Constraint
Port 4181 serves this clone. Browser inspection attempted before edits on 2026-09-17;
browser access denied because admin policy could not be verified. Do not bypass it.
Static and deterministic tests can proceed; screenshots, real touch feel, console and
GPU/performance certification remain pending until browser access is available.
