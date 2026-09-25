# Counters Ball 3D — Agent Guide

Shared instructions for every AI agent on this repo (Codex reads this file;
Claude Code reads it via `CLAUDE.md`). Two agents work here in parallel, so the
**Collaboration protocol** section is mandatory.

## Project
Browser game of Ghanaian bottle-cap tabletop football. Three.js r160 from CDN via
an import map, **no build step, no binary assets** — every texture, sound and
sprite is generated at runtime. **One owner-approved exception (2026-09-24):**
the soundtrack, the owner's three original recordings, as 128 kbps MP3 web
copies in `assets/audio/` (see `src/audio/soundtrack-*.js`). Sound effects and
ambience stay synthesised; do not add other binary assets without asking. Six-venue campaign vs a simulating AI, 2-player
hot-seat, procedural audio, depth-of-field street environments.

Read before changing things:
- `docs/codebase-summary.md` — architecture, update order, how to extend
- `docs/design-guidelines.md` — art, motion, environment and UI rules
- `docs/project-changelog.md` — what changed recently

## Run
```bash
/Library/Developer/CommandLineTools/usr/bin/python3 -m http.server 4180 --directory "/Users/bskt/Counters ball"
```
Codex's worktree uses port **4181** (see below). Open `http://localhost:<port>`.

## Code conventions
- ES modules, plain JS. Files are **kebab-case with long self-describing names**
  and stay **under 200 lines** — split by concern instead of growing a file.
- Folders: `core/ levels/ scene/ scene/environment/ gameplay/ fx/ audio/ ui/`.
- Physics space is 2D: `Vector2.x` = world x, `Vector2.y` = world z.
- World scale: 1 unit ≈ 19 cm (a cap is 0.17 units). Ground is at `GROUND_Y = -0.92`.
- Contact feedback uses one **strength 0..1** (impulse → approach speed).
- Seeded randomness (`createSeededRandom`) for anything visual that must look the
  same every load; `Math.random` only for gameplay noise and particles.
- Anything that must pause with the game uses `session.schedule()`, not `setTimeout`.
- Comments explain *why*; never reference plan phases or review finding codes.
- Keep it simple (YAGNI/KISS/DRY). Implement real behaviour, no mocks.

## Verifying changes
- Syntax: `for f in $(find src -name '*.js'); do node --check "$f"; done`
- In the browser, `window.__countersBall` exposes `{ app, progress, levels, actions }`.
- **Stale cache:** Python's server lets the browser keep old modules. Before
  judging a change, refresh them:
  `await Promise.all(performance.getEntriesByType('resource').map(r => fetch(r.name, {cache:'reload'}))); location.reload()`
- **Hidden preview panes throttle `requestAnimationFrame` to ~1 fps**, so the game
  looks frozen. Drive it directly instead: `app.session.update(1/60, t)` in a loop.
- Check the console for errors after every visual change.

## Git
- If `git`/`python3` complain about the Xcode licence (Codex hits this too), use
  `/Library/Developer/CommandLineTools/usr/bin/git` (and `.../python3`).
- Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`…), describe the
  change, **no AI/agent references** in messages. Small, focused commits.
- Never force-push, rewrite shared history, or commit on the other agent's branch.

## Collaboration protocol (Claude Code ⇄ Codex)
| | Claude Code | Codex |
|---|---|---|
| Folder | `/Users/bskt/Counters ball` | `/Users/bskt/Documents/ChatGPT/Counters ball` (own clone) |
| Branch | `main` | `main` |
| Dev server port | 4180 | 4181 |

### Deployment
GitHub Pages deploys from `main` automatically. Every `git push origin main`
goes live at **konk.world** — no Vercel or deploy script needed.

### Workflow
1. **Start of every session:** `git pull origin main` to get latest, then read
   `plans/agent-handoff-board.md` and `git log --oneline -10`.
2. **Claim before you edit:** run `node scripts/collaboration-workflow.mjs claim
   "Task title" file.js folder/`. Each owner writes only their own
   `plans/claims/<owner>.json`. Read the board too; until both clones adopt
   live claims, board claims still require manual coordination.
3. **Stay in your folder.** Each agent only writes inside its own folder.
4. **Push to `main`:** Both agents commit and push directly to `main`.
   Always `git pull --rebase origin main` before pushing to avoid conflicts.
5. **Hand off in writing:** when you finish or stop, move the task on the board
   and leave a short note — what changed, how you verified it, what's left.
6. **Shared files need care:** `AGENTS.md`, `docs/*`, and
   `src/levels/campaign-level-definitions.js` change rarely — note it on the board.
7. **Before committing:** rerun status, verify, release your completed claim,
   and stage only intended files. Run `node scripts/collaboration-workflow.mjs handoff`
   after committing. Keep paused work claimed. See `docs/collaboration-workflow.md`
   for bootstrap, commands and integration rules.
