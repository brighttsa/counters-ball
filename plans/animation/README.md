# Animation plans (audit of a62bc20)

Motion audit of KONK!: the foundations are sound (interruptible callouts, staggered cards, reduced motion respected). These are small, independent polish plans.

| # | Plan | Severity | Depends on | Status |
|---|---|---|---|---|
| 004 | [One token for the strong ease-out](004-one-strong-ease-out-token.md) | LOW | none (do first so later plans can use the token) | DONE |
| 001 | [Ease the GOAL / SO CLOSE / turn callout](001-ease-the-kinetic-event-callout.md) | MEDIUM | none | DONE |
| 002 | [Calm the icon-button press](002-calm-icon-button-press.md) | MEDIUM | none | DONE |
| 003 | [Sharper star rise on the results card](003-results-star-rise-in.md) | LOW | 004 (optional) | DONE |
| 005 | [Pop the Daily Flick result headline](005-daily-flick-headline-pop.md) | LOW | 004 (optional) | DONE |
| 006 | [Fade in the Share goal clip button](006-goal-clip-button-fade-in.md) | LOW | 004 (optional) | DONE |

Recommended order: 004 → 001 → 002 → 003 → 005 → 006. Plans 003, 005 and 006 all edit `styles/game-ui-menus-and-results.css`: run them one after another, not in parallel, and bump its `?v=` once per commit.

Rejected in the audit: Tap to play pulse (single CTA, reduced-motion aware), turn-banner spring (5 px, overshoot imperceptible), pause-screen fades (already off).
