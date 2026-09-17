# Agent Handoff Board

Shared task board for Claude Code and Codex. Read at the start of every session.
Claim files before editing; move tasks and leave a note when you stop.
Protocol: see `AGENTS.md` → Collaboration protocol.

## In progress
| Task | Owner | Branch | Files / folders claimed | Started |
|---|---|---|---|---|
| Mobile touch pass (implementation complete; browser verification blocked) | Codex | `codex/workspace` | `src/gameplay/human-drag-aim-input.js`, `styles/game-ui-base-and-hud.css`, `plans/agent-handoff-board.md` | 2026-09-17 |

### Mobile touch pass handoff - 2026-09-17
- Added nearest controllable-cap selection within 24 CSS pixels for touch misses, finger-relative pull with a frozen camera projection, and release-position sampling.
- Pointer cancellation, lost capture, window blur, resize, and pause discard the gesture without spending a flick. Pointer capture is released on cleanup; secondary mouse buttons are ignored.
- Narrow/coarse landscape HUD uses bounded, wrapping team names and 48px controls; pause sits at the safe-area bottom left, opposite sound.
- All source JavaScript syntax checks and `git diff --check` passed. Served this clone on port 4181; Playwright reported the game page title on initial navigation.
- Full browser verification remains blocked: the browser tool could not verify the admin-enforced policy for localhost. No visual/touch checks are claimed. Keep this task out of Done until portrait (320/390px), landscape, desktop, touch cancellation/multitouch, pause/resume, rendered canvas, and console checks pass. Physical-device feel remains to be assessed.
- Implementation is in the commit containing this note on `codex/workspace`; merge through the normal clone workflow after verification.

## Up next (unclaimed — pick one, move it to In progress)
| Task | Suggested owner | Notes |
|---|---|---|
| Measure frame rate on a phone-sized viewport with the pane visible; tune shadow map size / bokeh if under 50 fps | either | 4096² sun shadow + BokehPass are the likely costs |
| Automated regression script driving `session.update()` (flick → goal → results → stars) | either | Would replace the manual console checks |

## Done (newest first)
| Task | Owner | Commit | Handoff note |
|---|---|---|---|
| Realistic venue environments matched to pitch names | Claude Code | `1820560` | Ground, props, walls, fowl, shade, dust, night spill light, DOF sharp zone. Verified all 6 venues in browser, no errors. |
| Campaign, AI opponent, menus, game feel | Claude Code | `171cb18` | Full game loop verified; review fixes applied. |
