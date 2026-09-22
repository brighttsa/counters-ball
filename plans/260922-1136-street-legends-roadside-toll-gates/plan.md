# Street Legends — vertical slice and rollout plan

Design source: `docs/street-legends-design-matrix.md`.

## Phase 1 — Roadside Showdown vertical slice (done)
- [x] Toll-gate state machine: per-plaza signal cycle, jams, hero labels (`src/gameplay/toll-gate-lane-signal-state.js`)
- [x] Physics: switchable static bodies (raised booms)
- [x] Toll plaza set piece + canopy (`src/scene/toll-plaza-booths-booms-and-signals.js`)
- [x] AI: lane candidates, block moves, next-lane foresight, rival tactics (`toll-gate-ai-lane-evaluation.js`)
- [x] Three acts, solo allowance (`awayFlickLimit`), reduced away formation (`awaySlots`)
- [x] Mode entry, intro, HUD objective, results, next act
- [x] Flick Vector redesign (thicker ribbon, broad head, outline)
- [x] Chickens removed from shared compositions (guinea fowl stay at Tamale)
- [x] Headless balance playtests; unit/regression tests
- [ ] Physical-phone pass (touch feel, lamp readability in sunlight, fps)

## Phase 2 — Reusable mechanic kit (next, before any new venue)
Extract what every venue mechanic needs, so the next five are content, not plumbing:
- `mechanic` interface already used: `update`, `busy`, `observe`, `noteImpact`, `goalLabel`, `aiCandidates`, `aiScore`.
- Add a registry `type → factory` in `street-legends-venue-mechanic-wiring.js`.
- Add a turn-telegraph helper (lamp/pool/chalk arrow) shared by all venues.
- Add per-act `awaySlots`/`homeSlots` and an optional ball start position.

## Phase 3 — venues, in priority order
Priority is set by fun-per-effort and by how much new tech each venue needs.

| # | Venue | Mechanic | Why this order | New tech |
|---|---|---|---|---|
| 1 | Harmattan Haze (Tamale) | Departing lorry: moving goal, one notch per turn | Most "WAIT, I can do that?" after toll gates, and it reuses the per-turn signal pattern | Movable goal colliders + goal detection at a moving x/z |
| 2 | Schoolyard Break (Adabraka) | Ruler seesaw: rebound surface re-angles each turn | Teaches banking early in the mode; a simple static line collider | Segment (capsule) collider in physics |
| 3 | Kiosk Corner (Nima) | Change dish rotating in the goal mouth | Reuses the segment collider from #2 | Rotated arc of beads |
| 4 | Veranda Derby (Kumasi) | Pot maze + bank-only goals | Pure layout + a goal-validity rule; cheap once the kit exists | Goal validity hook in rules |
| 5 | Lights Out Final (Jamestown) | Lights-on target chain unlocking the goal | Finale; combines targets, a locked goal and beam telegraph | Target bodies, goal lock |

Each venue ships as: 3 acts → headless balance playtest → browser/mobile check → docs row.

## Balance targets (headless, medium bot as player proxy)
- Act 1 (discover): player proxy wins ≥ 60% within the flick allowance.
- Act 2 (master): proxy vs rival 35–55% player wins, ≤ 35% draws.
- Act 3 (showdown): 25–45% player wins; mechanic-labelled goals ≥ 40% of goals.
- Mechanic-aware proxy must beat a mechanic-blind proxy, so a player can deliberately improve.

## Risks
- Draw-heavy matches if a mechanic is too defensive → widen windows or add allowance.
- Mobile readability of telegraphs → lamp + floor pool + HUD line, verified on device.
- AI planning cost grows with candidates → keep candidate additions ≤ ~10 per cap.
