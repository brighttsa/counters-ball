# 001 · Ease the GOAL / SO CLOSE / turn callout
Severity: MEDIUM · Category: Easing & duration · Written at commit a62bc20

## Problem
`src/ui/ui-kinetic-event-callout.js` animates its enter and exit with **linear** progress, so the most frequent in-match callout (every goal, turn call, SO CLOSE!, venue events) moves at a constant speed and feels mechanical.

Current code (lines ~33-41, `paint()`):
```js
const enter = Math.min(1, elapsed / Math.min(0.14, duration / 3));
const exit = Math.max(0, 1 - (duration - elapsed) / Math.min(0.16, duration / 3));
```
Those two values then drive offset, opacity, scale and lift linearly.

## Target
- Enter: ease-out, equivalent to `cubic-bezier(0.23, 1, 0.32, 1)` (fast start, soft landing). Use the closed form `easeOutQuint(t) = 1 - (1 - t) ** 5` (close match, cheap per frame).
- Exit: ease-in `easeInCubic(t) = t ** 3` (it leaves quickly and cleanly).
- Keep the durations exactly (0.14 s enter cap, 0.16 s exit cap) and keep the interruption behaviour (a new event starts from the current offset/opacity/scale/lift).

## Scope
- `src/ui/ui-kinetic-event-callout.js` only.

## Steps
1. Add two small module-level helpers above the class:
   `const easeOut = (t) => 1 - (1 - t) ** 5;` and `const easeIn = (t) => t ** 3;` with a one-line comment: entrance lands softly, exit leaves fast.
2. In `paint()`, wrap the raw values: `const enter = easeOut(Math.min(1, ...));` and `const exit = easeIn(Math.max(0, ...));`. Change nothing else.
3. Bump the version tag wherever this module is imported with `?v=` (grep `ui-kinetic-event-callout.js`).

## Verify
- Tests all pass.
- Feel-check: score a goal and watch the GOAL callout; it should snap in and settle, not slide at constant speed. Trigger two callouts back to back (e.g. SO CLOSE then GOAL): the second must start from where the first was, with no jump.
- Reduced motion on: callout only fades (offset/scale/lift stay 0), as before.
## Ground rules for the executor
- Edit only the files listed under Scope. No refactors, no renames, no new dependencies.
- Keep every file under 200 lines; comments explain why, never plan numbers.
- Verify: `COUNTERS_TEST_THREE=/tmp/counters-ball-test-three-r160.mjs node --test tests/*.test.mjs` must stay all-pass; syntax check with `node --check <file>` for JS.
- Stale-cache rule of this repo: if you change a JS/CSS file that is imported or linked with a `?v=N` tag, bump N at every place that references it (and bump `src/main.js?v=` in index.html when main.js changes).
- Run the game on http://localhost:4180 (preview config `counters-ball-3d`) and feel-check as described below. Also check with the OS 'Reduce motion' setting on.
- Git: use /Library/Developer/CommandLineTools/usr/bin/git; conventional commit, no AI references. Follow AGENTS.md collaboration protocol (claim files first).
