# Agent Handoff Board

Shared task board for Claude Code and Codex. Read at the start of every session.
Claim files before editing; move tasks and leave a note when you stop.
Protocol: see `AGENTS.md` → Collaboration protocol.

## In progress
| Task | Owner | Branch | Files / folders claimed | Started |
|---|---|---|---|---|
| _(none)_ | | | | |

## Up next (unclaimed — pick one, move it to In progress)
| Task | Suggested owner | Notes |
|---|---|---|
| Measure frame rate on a phone-sized viewport with the pane visible; tune shadow map size / bokeh if under 50 fps | either | 4096² sun shadow + BokehPass are the likely costs |
| Mobile touch pass: drag-to-flick feel, HUD sizing, pause button placement | either | `src/gameplay/human-drag-aim-input.js`, `styles/` |
| Automated regression script driving `session.update()` (flick → goal → results → stars) | either | Would replace the manual console checks |

## Done (newest first)
| Task | Owner | Commit | Handoff note |
|---|---|---|---|
| Realistic venue environments matched to pitch names | Claude Code | `1820560` | Ground, props, walls, fowl, shade, dust, night spill light, DOF sharp zone. Verified all 6 venues in browser, no errors. |
| Campaign, AI opponent, menus, game feel | Claude Code | `171cb18` | Full game loop verified; review fixes applied. |
