# 003 · Sharper star rise on the results card
Severity: LOW · Category: Easing · Written at commit a62bc20

## Problem
`styles/game-ui-menus-and-results.css`:
```css
.results-stars li.earned .result-star { ...; animation: rise-in 250ms ease both; }   /* ~line 113 */
@keyframes rise-in { from { opacity: 0; transform: translateY(12px) scale(0.85); } }  /* ~line 126 */
```
The generic `ease` curve and the 0.85 start make the earned star feel soft. Stars are already staggered by JS (`ui-full-time-results-card.js`, a timeout per star with a ding), so only the curve and depth change.

## Target
```css
... animation: rise-in 300ms cubic-bezier(0.23, 1, 0.32, 1) both;
@keyframes rise-in { from { opacity: 0; transform: translateY(10px) scale(0.9); } }
```
If plan 004 has landed, use `var(--ease-out-strong)` instead of the literal cubic-bezier.

## Scope
- `styles/game-ui-menus-and-results.css` (those two lines). Bump its `?v=` in index.html.

## Verify
- Tests pass. Win a match with 3 stars; each star should pop up crisply as its ding plays.
- Reduced motion: the global rule in game-ui-base-and-hud.css already shortens it to ~0; confirm stars just appear.
## Ground rules for the executor
- Edit only the files listed under Scope. No refactors, no renames, no new dependencies.
- Keep every file under 200 lines; comments explain why, never plan numbers.
- Verify: `COUNTERS_TEST_THREE=/tmp/counters-ball-test-three-r160.mjs node --test tests/*.test.mjs` must stay all-pass; syntax check with `node --check <file>` for JS.
- Stale-cache rule of this repo: if you change a JS/CSS file that is imported or linked with a `?v=N` tag, bump N at every place that references it (and bump `src/main.js?v=` in index.html when main.js changes).
- Run the game on http://localhost:4180 (preview config `counters-ball-3d`) and feel-check as described below. Also check with the OS 'Reduce motion' setting on.
- Git: use /Library/Developer/CommandLineTools/usr/bin/git; conventional commit, no AI references. Follow AGENTS.md collaboration protocol (claim files first).
