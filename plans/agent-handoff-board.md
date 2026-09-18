# Agent Handoff Board

Shared task board for Claude Code and Codex. Read at the start of every session.
Claim files before editing; move tasks and leave a note when you stop.
Protocol: see `AGENTS.md` → Collaboration protocol.

## In progress
| Task | Owner | Branch | Files / folders claimed | Started |
|---|---|---|---|---|
| Venue identity and Flick Vector (audit/plan; awaiting implementation approval) | Codex | `codex/workspace` | `src/scene/`, `src/gameplay/aim-*`, new flick-vector modules, input/session integration, camera, shared `src/levels/`, audio/photo profiles, `tests/`, shared `docs/*`, `plans/260918-venue-identity-flick-vector/`; continuation of own broadcast claim | 2026-09-18 |
| Broadcast sport and Flick Craft redesign | Codex | `codex/workspace` | `src/`, `styles/`, `index.html`, `tests/`, `plans/260917-broadcast-sport/`, shared `docs/*`; includes continuation of own mobile task | 2026-09-17 |
| Mobile touch pass (implementation complete; browser verification blocked) | Codex | `codex/workspace` | `src/gameplay/human-drag-aim-input.js`, `styles/game-ui-base-and-hud.css`, `plans/agent-handoff-board.md` | 2026-09-17 |

### Mobile touch pass handoff - 2026-09-17
- Added nearest controllable-cap selection within 24 CSS pixels for touch misses, finger-relative pull with a frozen camera projection, and release-position sampling.
- Pointer cancellation, lost capture, window blur, resize, and pause discard the gesture without spending a flick. Pointer capture is released on cleanup; secondary mouse buttons are ignored.
- Narrow/coarse landscape HUD uses bounded, wrapping team names and 48px controls; pause sits at the safe-area bottom left, opposite sound.
- All source JavaScript syntax checks and `git diff --check` passed. Served this clone on port 4181; Playwright reported the game page title on initial navigation.
- Full browser verification remains blocked: the browser tool could not verify the admin-enforced policy for localhost. No visual/touch checks are claimed. Keep this task out of Done until portrait (320/390px), landscape, desktop, touch cancellation/multitouch, pause/resume, rendered canvas, and console checks pass. Physical-device feel remains to be assessed.
- Implementation is in the commit containing this note on `codex/workspace`; merge through the normal clone workflow after verification.

## Blocked

### Public deployment - 2026-09-17
- User subsequently said Yes to reconnecting/enabling public access. Main task is checking once; success is not yet confirmed.
- User authorized a NEW PUBLIC DEPLOYMENT. Vercel created `dpl_8DuNJxffSAwaR1jr8juAGp8YgQkJ` from `e982a1b` (48 runtime files only), but the unauthenticated alias returned HTTP 302 to Vercel SSO: NOT publicly accessible.
- `get_deployment` returned HTTP 403 scope authorization for `team_aBn8fiH2WyGceG4B0GFLAWzi`; `list_teams` was empty. Pending action: enable public access using the proper Vercel account/project, then verify unauthenticated availability. Main deployment task owns connector verification.
- Supplied review passed 43 JavaScript syntax checks, 79 local references, 28 bare imports, and whitespace checks; no static blocker found. Mobile browser verification remains unverified/admin policy blocked. Historical completed phase plans are unchanged.
- Full URLs and evidence: [deployment handoff](reports/pm-260917-1214-deployment-handoff.md). Reflection: [journal](../docs/journals/260917-1214-deployment-access-blocker.md).

## Up next (unclaimed — pick one, move it to In progress)
| Task | Suggested owner | Notes |
|---|---|---|
| Measure frame rate on a phone-sized viewport with the pane visible; tune shadow map size / bokeh if under 50 fps | either | 4096² sun shadow + BokehPass are the likely costs |
| Automated regression script driving `session.update()` (flick → goal → results → stars) | either | Would replace the manual console checks |

## Done (newest first)
| Task | Owner | Commit | Handoff note |
|---|---|---|---|
| Deployment documentation handoff (documentation only) | Codex docs | Commit containing this note | Claimed and completed deployment board entry, handoff report, and shared `docs/journals/` entry. Checked supplied evidence and documentation diff; public delivery remains blocked above. No implementation changes. |
| Realistic venue environments matched to pitch names | Claude Code | `1820560` | Ground, props, walls, fowl, shade, dust, night spill light, DOF sharp zone. Verified all 6 venues in browser, no errors. |
| Campaign, AI opponent, menus, game feel | Claude Code | `171cb18` | Full game loop verified; review fixes applied. |
