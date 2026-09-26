# 004 · One token for the strong ease-out
Severity: LOW · Category: Cohesion & tokens · Written at commit a62bc20

## Problem
Two ease-out curves coexist: the token `--ease-out: cubic-bezier(0.2, 0.9, 0.3, 1)` (`styles/game-ui-base-and-hud.css` ~line 33) and a hard-coded `cubic-bezier(0.23, 1, 0.32, 1)` in:
- `styles/game-ui-menus-and-results.css` ~line 6: `.screen.is-active { ... animation: screen-in 200ms cubic-bezier(0.23, 1, 0.32, 1) both; }`
- `styles/ink-impact-home.css` ~line 337: `animation: attract-callout-in 220ms cubic-bezier(0.23, 1, 0.32, 1);`

## Target
1. In the `:root` block of `styles/game-ui-base-and-hud.css`, directly under `--ease-out`, add:
   `--ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1); /* entrances that should land softly: screens, callouts */`
2. Replace the two hard-coded curves above with `var(--ease-out-strong)`.
Do not change `--ease-out` or any other timing.

## Scope
The three CSS files named above; bump each one's `?v=` in index.html.

## Verify
- Tests pass. Open menus, the title screen and a match: nothing should look different (same curve, now named).
- `grep -rn "0.23, 1, 0.32, 1" styles` returns only the token definition.
## Ground rules for the executor
- Edit only the files listed under Scope. No refactors, no renames, no new dependencies.
- Keep every file under 200 lines; comments explain why, never plan numbers.
- Verify: `COUNTERS_TEST_THREE=/tmp/counters-ball-test-three-r160.mjs node --test tests/*.test.mjs` must stay all-pass; syntax check with `node --check <file>` for JS.
- Stale-cache rule of this repo: if you change a JS/CSS file that is imported or linked with a `?v=N` tag, bump N at every place that references it (and bump `src/main.js?v=` in index.html when main.js changes).
- Run the game on http://localhost:4180 (preview config `counters-ball-3d`) and feel-check as described below. Also check with the OS 'Reduce motion' setting on.
- Git: use /Library/Developer/CommandLineTools/usr/bin/git; conventional commit, no AI references. Follow AGENTS.md collaboration protocol (claim files first).
