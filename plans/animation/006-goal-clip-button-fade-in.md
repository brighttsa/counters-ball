# 006 · Fade in the Share goal clip button
Severity: LOW (missed opportunity) · Category: Preventing a jarring change · Written at commit a62bc20

## Why
On the results card, `#btn-clip` ("Share goal clip", class `results-clip`) is unhidden by JS when the recording finishes, which can be a moment after the card appears, so it pops in and pushes the buttons below it down. A short fade-and-rise tells the player something new arrived.

Current CSS (`styles/game-ui-menus-and-results.css`, end of file):
```css
.results-clip { display: block; width: 100%; margin: 0 0 12px; }
.results-clip[hidden] { display: none; }
```

## Target
Add, right after those rules:
```css
.results-clip:not([hidden]) { animation: rise-in 220ms cubic-bezier(0.23, 1, 0.32, 1) both; }
```
(`var(--ease-out-strong)` if plan 004 landed.) CSS only: the `hidden` toggle in `src/ui/goal-replay-clip-recorder.js` stays as it is.

## Scope
`styles/game-ui-menus-and-results.css`. Bump its `?v=` in index.html.

## Verify
- Tests pass. Score a replayed goal (a bounce goal or a hard shot), finish the match; the clip button eases in instead of snapping. Reduced motion: it just appears.
## Ground rules for the executor
- Edit only the files listed under Scope. No refactors, no renames, no new dependencies.
- Keep every file under 200 lines; comments explain why, never plan numbers.
- Verify: `COUNTERS_TEST_THREE=/tmp/counters-ball-test-three-r160.mjs node --test tests/*.test.mjs` must stay all-pass; syntax check with `node --check <file>` for JS.
- Stale-cache rule of this repo: if you change a JS/CSS file that is imported or linked with a `?v=N` tag, bump N at every place that references it (and bump `src/main.js?v=` in index.html when main.js changes).
- Run the game on http://localhost:4180 (preview config `counters-ball-3d`) and feel-check as described below. Also check with the OS 'Reduce motion' setting on.
- Git: use /Library/Developer/CommandLineTools/usr/bin/git; conventional commit, no AI references. Follow AGENTS.md collaboration protocol (claim files first).
