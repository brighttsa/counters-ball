# Counters Ball 3D — Agent Guide

Shared instructions for every AI agent on this repo (Codex reads this file;
Claude Code reads it via `CLAUDE.md`). Two agents work here in parallel, so the
**Collaboration protocol** section is mandatory.

## Project
Browser game of Ghanaian bottle-cap tabletop football. Three.js r160 from CDN via
an import map, **no build step, no binary assets** — every texture, sound and
sprite is generated at runtime. Six-venue campaign vs a simulating AI, 2-player
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
| Branch | `main` | `codex/workspace` (or `codex/<task>`) |
| Dev server port | 4180 | 4181 |

1. **Start of every session:** read `plans/agent-handoff-board.md` and
   `git log --oneline -10 --all`.
2. **Claim before you edit:** add your task to the board with the files/folders
   you will touch. Don't edit files another agent has claimed as *In progress*.
3. **Stay in your folder.** Each agent only writes inside its own folder.
4. **Integrate through git:** Codex commits on its branch in its clone; Claude fetches it (remote `codex`) and
   merges into `main`. Before starting new work, Codex updates from `main`
   (`git pull origin main` in its clone — `origin` is Claude's repo).
5. **Hand off in writing:** when you finish or stop, move the task on the board
   and leave a short note — what changed, how you verified it, what's left.
6. **Shared files need care:** `AGENTS.md`, `docs/*`, and
   `src/levels/campaign-level-definitions.js` change rarely — note it on the board.
