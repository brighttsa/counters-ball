# 002 · Calm the icon-button press (pause, sound)
Severity: MEDIUM · Category: Physicality · Written at commit a62bc20

## Problem
`styles/game-ui-base-and-hud.css` (~lines 140-142):
```css
  transition: transform 0.2s var(--spring), background 0.2s;
}
.icon-btn:active { transform: scale(0.92); }
```
`--spring` is `cubic-bezier(0.2, 1.6, 0.4, 1)`, which overshoots, so the pause and ♪ buttons wobble on every press and release. `scale(0.92)` is deeper than the rest of the UI (`.btn` uses `scale(.985)`, camera buttons `.98`). Pause is pressed often in matches.

## Target
```css
  transition: transform 120ms var(--ease-out), background 160ms ease;
}
.icon-btn:active { transform: scale(0.95); }
```
(`--ease-out` is `cubic-bezier(0.2, 0.9, 0.3, 1)`, already defined at the top of the same file.)

## Scope
- `styles/game-ui-base-and-hud.css`: only the `.icon-btn` transition line and the `.icon-btn:active` rule.
- `index.html`: bump `styles/game-ui-base-and-hud.css?v=N` by one.

## Verify
- Tests pass.
- Feel-check on a phone: tap pause and ♪ quickly several times; the press should feel firm with no bounce after release.
## Ground rules for the executor
- Edit only the files listed under Scope. No refactors, no renames, no new dependencies.
- Keep every file under 200 lines; comments explain why, never plan numbers.
- Verify: `COUNTERS_TEST_THREE=/tmp/counters-ball-test-three-r160.mjs node --test tests/*.test.mjs` must stay all-pass; syntax check with `node --check <file>` for JS.
- Stale-cache rule of this repo: if you change a JS/CSS file that is imported or linked with a `?v=N` tag, bump N at every place that references it (and bump `src/main.js?v=` in index.html when main.js changes).
- Run the game on http://localhost:4180 (preview config `counters-ball-3d`) and feel-check as described below. Also check with the OS 'Reduce motion' setting on.
- Git: use /Library/Developer/CommandLineTools/usr/bin/git; conventional commit, no AI references. Follow AGENTS.md collaboration protocol (claim files first).
