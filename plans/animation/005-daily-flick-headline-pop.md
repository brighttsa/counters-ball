# 005 · Pop the Daily Flick result headline
Severity: LOW (missed opportunity) · Category: Delight · Written at commit a62bc20

## Why
The Daily Flick result card (`index.html` section `data-screen="daily-result"`, headline `<h2 class="card-title" id="daily-headline">`) shows "Under par!" / "On par" flat. It is seen once or a few times a day: the delight budget allows a small pop.

## Target
Reuse the existing `rise-in` keyframes (`styles/game-ui-menus-and-results.css`), delayed so it lands after the card itself (screen-in is 200ms):
```css
/* Daily Flick: the verdict lands just after the card. */
.screen-daily.is-active #daily-headline { animation: rise-in 300ms cubic-bezier(0.23, 1, 0.32, 1) 120ms both; }
```
(Use `var(--ease-out-strong)` if plan 004 landed.) Add it at the end of `styles/game-ui-menus-and-results.css`. No JS changes.

## Scope
`styles/game-ui-menus-and-results.css` (append only). Bump its `?v=` in index.html.

## Verify
- Tests pass. Play Daily Flick to the end (or trigger the result: start it, then in DevTools `window.__countersBall.app.session.options.onEnd({winner:'home', flicksUsed:{home:2,away:0}})`). The headline rises in just after the card; Try again → finish again replays it.
- Reduced motion: it appears without movement.
## Ground rules for the executor
- Edit only the files listed under Scope. No refactors, no renames, no new dependencies.
- Keep every file under 200 lines; comments explain why, never plan numbers.
- Verify: `COUNTERS_TEST_THREE=/tmp/counters-ball-test-three-r160.mjs node --test tests/*.test.mjs` must stay all-pass; syntax check with `node --check <file>` for JS.
- Stale-cache rule of this repo: if you change a JS/CSS file that is imported or linked with a `?v=N` tag, bump N at every place that references it (and bump `src/main.js?v=` in index.html when main.js changes).
- Run the game on http://localhost:4180 (preview config `counters-ball-3d`) and feel-check as described below. Also check with the OS 'Reduce motion' setting on.
- Git: use /Library/Developer/CommandLineTools/usr/bin/git; conventional commit, no AI references. Follow AGENTS.md collaboration protocol (claim files first).
