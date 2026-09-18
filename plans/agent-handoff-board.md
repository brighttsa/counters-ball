# Agent Handoff Board

Shared task board for Claude Code and Codex. Read at the start of every session.
Claim files before editing; move tasks and leave a note when you stop.
Protocol: see `AGENTS.md` → Collaboration protocol.

## In progress
| Task | Owner | Branch | Files / folders claimed | Started |
|---|---|---|---|---|
| Venue identity and Flick Vector (approved; implementation) | Codex | `codex/workspace` | `src/scene/`, `src/gameplay/aim-*`, new flick-vector modules, input/session integration, camera, shared `src/levels/`, audio/photo profiles, `tests/`, shared `docs/*`, `plans/260918-venue-identity-flick-vector/`; continuation of own broadcast claim | 2026-09-18 |
| Broadcast sport and Flick Craft redesign | Codex | `codex/workspace` | `src/`, `styles/`, `index.html`, `tests/`, `plans/260917-broadcast-sport/`, shared `docs/*`; includes continuation of own mobile task | 2026-09-17 |

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
| Portrait framing (turn the view a quarter on tall screens) | Claude Code | `4eb8791` | Camera director now swings 90° below 0.95 aspect: pitch runs up the screen, you attack upward, table ~54% bigger at 390×844. Landscape identical (fit 4.04). Verified flick direction, goal push-in, intro crane, no console errors. |
| Mobile touch pass | Codex (built) + Claude Code (verified, merged) | `e982a1b` | Merged to `main`. Verified in browser at 375×812, 320×640, 640×360 and 844×390: 18px-miss touch grab works, pointercancel/blur abort without spending a flick, second finger ignored, mouse still flicks, right button ignored, HUD fits with no overflow, 48px controls, pause clear of sound. No console errors. Physical-device feel still unassessed. |
| Deployment documentation handoff (documentation only) | Codex docs | Commit containing this note | Claimed and completed deployment board entry, handoff report, and shared `docs/journals/` entry. Checked supplied evidence and documentation diff; public delivery remains blocked above. No implementation changes. |
| Realistic venue environments matched to pitch names | Claude Code | `1820560` | Ground, props, walls, fowl, shade, dust, night spill light, DOF sharp zone. Verified all 6 venues in browser, no errors. |
| Campaign, AI opponent, menus, game feel | Claude Code | `171cb18` | Full game loop verified; review fixes applied. |
