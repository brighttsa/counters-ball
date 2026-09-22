# Agent Handoff Board

Shared task board for Claude Code and Codex. Read at the start of every session.
Claim files before editing; move tasks and leave a note when you stop.
Protocol: see `AGENTS.md` → Collaboration protocol.
Live ownership: run `node scripts/collaboration-workflow.mjs status` in your
own clone. Each owner's live `plans/claims/<owner>.json` and dirty files take
precedence over stale copies of this board. Until both clones adopt the helper,
coordinate board claims manually. See `docs/collaboration-workflow.md`.

## In progress
| Task | Owner | Branch | Files / folders claimed | Started |
|---|---|---|---|---|

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
| Physical-phone pass (iOS Safari + Android Chrome) | user + either | Flick Vector feel/readability in sunlight, camera lock and recovery on release, 2.8 s openings and auto kick-off, replay skip, audio (tension/heat beds, pause silence), sustained fps and heat, rotation mid-drag and mid-replay |
| Ignore local tool debris | Codex | Its clone has untracked `.DS_Store` and `.playwright-cli/` snapshots; add both to `.gitignore` so they never get staged |
| Street Legends phase 2: mechanic registry + shared telegraph helper, then Harmattan Haze moving goal | either | Plan: `plans/260922-1136-street-legends-roadside-toll-gates/plan.md` |
| Human playtest of Street Legends Acts 2–3 (draw rate) | user | Bot proxy draws 53–62%; decide golden-flick sudden death vs +2 flicks after real play |
| Skip render on a zero-size viewport | either | A 0×0 window (collapsed pane, some mobile transitions) makes the bloom/bokeh targets zero-sized → `GL_INVALID_FRAMEBUFFER_OPERATION` spam. Pre-existing; guard in `src/core/game-render-loop-and-viewport.js` |

## Done (newest first)
| Task | Owner | Commit | Handoff note |
|---|---|---|---|
| Street Legends vertical slice: Roadside toll gates (3 acts), Flick Vector redesign, chickens removed | Claude Code | `9bc233d` | New mode from the title; Classic and 2-Player untouched. Mechanic, AI and balance history: `docs/street-legends-design-matrix.md`, `plans/reports/playtest-260922-street-legends-roadside-toll-gates.md`. 98 tests pass. Browser: every act reaches play, a toll goal → hero label → replay → results → Next Act, classic Roadside has no mechanic, console clean. Open: Act 2/3 draw rates for the bot proxy (53–62%), human and phone playtest, sustained phone fps. Next venue order: `plans/260922-1136-street-legends-roadside-toll-gates/plan.md`. |
| Review + integrate broadcast, venue identity and Flick Vector range (`ca5d192`…`144fce4`) | Claude Code | `144fce4` (fast-forward) | Read the full range (88 files). Reran suite on r160: 90 pass, 0 fail, 0 skip; syntax clean, no src file >200 lines. On 4182/4180: all six venue previews and openings reach play with 0 GL errors and a clean console; real flick → moving → AI turn → goal → 3-star result; locked venue refuses entry; menu overlay covers the preview table; portrait 375×812 aim points up-field, camera locks while aiming and unlocks on release/cancel with no flick spent. MutationObserver diagnostic: an instrumented `observe` recorded zero calls from game code across all venues. With no source URL it is most likely injected by Codex's browser automation (`.playwright-cli/` snapshots in its clone), and it never appears in the in-app browser. Desktop now frames wider (`LANDSCAPE_FIT` 2.2×1.9) by design. No deployment. |
| Venue identity and Flick Vector implementation | Codex | `5301752`, `cb5a228` | Six constructions, seeded surfaces/markings, layered surroundings/openings, four-part mobile-readable aim and camera lock. 90 tests pass; all six venues/openings and 320/375/390/430 aim captured on 4181. Independent reviewer hit usage limit; physical-device checks and unattributed browser MutationObserver diagnostic remain. See `docs/venue-flick-vector-verification.md`. Claude clone unchanged; no deployment. |
| Collaboration workflow | Codex | Commit containing this note | Live cross-clone claim/dirty-file checks; owner-only claim records; clean, fast-forward-only sync; exact-commit handoff. 10 workflow tests and full 74-test suite pass, no skips. Claude clone unchanged. Claude must fetch and cherry-pick this workflow-only commit to adopt it; game redesign WIP excluded. No new browser verification needed for CLI-only changes. |
| Portrait framing (turn the view a quarter on tall screens) | Claude Code | `4eb8791` | Camera director now swings 90° below 0.95 aspect: pitch runs up the screen, you attack upward, table ~54% bigger at 390×844. Landscape identical (fit 4.04). Verified flick direction, goal push-in, intro crane, no console errors. |
| Mobile touch pass | Codex (built) + Claude Code (verified, merged) | `e982a1b` | Merged to `main`. Verified in browser at 375×812, 320×640, 640×360 and 844×390: 18px-miss touch grab works, pointercancel/blur abort without spending a flick, second finger ignored, mouse still flicks, right button ignored, HUD fits with no overflow, 48px controls, pause clear of sound. No console errors. Physical-device feel still unassessed. |
| Deployment documentation handoff (documentation only) | Codex docs | Commit containing this note | Claimed and completed deployment board entry, handoff report, and shared `docs/journals/` entry. Checked supplied evidence and documentation diff; public delivery remains blocked above. No implementation changes. |
| Realistic venue environments matched to pitch names | Claude Code | `1820560` | Ground, props, walls, fowl, shade, dust, night spill light, DOF sharp zone. Verified all 6 venues in browser, no errors. |
| Campaign, AI opponent, menus, game feel | Claude Code | `171cb18` | Full game loop verified; review fixes applied. |
