# Playtest report — Street Legends, Roadside toll gates

Method: headless full matches with the real rules, physics, toll-gate state
and AI planner. The "player" is the medium AI used as a proxy; the rival is
Akosua with her tactics. Harness: session scratchpad `headless-toll-gate-playtest.mjs`
(not committed). Win % = player wins / games.

## Iterations
| # | Rule set | Act 1 | Act 2 | Finding → change |
|---|---|---|---|---|
| 1 | One lane open, signal steps per global turn, 6 flicks | 27% (rookie 0%) | home 0 / away 7 / 23 draws of 30 | Alternating turns meant home only ever met left/right, never centre → **per-plaza signal stepped by its attacker** |
| 2 | + per-plaza step, 8 flicks, keeper + 2 back caps | 10% | 70–77% draws | Even with no defenders, one open lane of three is a wall → **caps slide under booms (scale rule), only the ball is blocked** |
| 3 | + caps under booms | 10–30% | ~70% draws | A 1.5-unit shot from kickoff is the real barrier in a *discover* act → **ball starts at the plaza** (`ballStart`) |
| 4 | + ball start | 57% blind / 27–35% aware | ~75% draws | Aware AI was worse: "+150 past the plaza" bonus parked balls by back caps; defence terms active in solo → **removed bonus, `defend:false` in solo** |
| 5 | **One boom down, two lanes open** (traffic-light amber = closes next) | **63% blind / 68% aware** | home 23–30%, draws 53–57% | Aware rival beats blind rival (7 vs 4 wins). Act 3 vs *hard* = 0/20 → **medium aim + sharper tactics** |
| 6 | Act 3 medium + tactics (block 2, caution 1.5) | — | Act 3: home 33%, away 4%, draws 62% | In target for wins; draws high |

## Against the fun questions
- **New decision?** Yes: shoot through the amber lane before it shuts, or set up for a lane that stays green. Slide a cap under a boom to block. Leave the ball under a boom to jam it.
- **Understood in a minute?** Lamps and floor pools, a HUD line ("Boom down: RIGHT · Closes next: CENTRE"), and a first-turn callout.
- **Can you deliberately improve?** Partly shown: the toll-aware rival outscores the toll-blind rival. Toll-aware and blind player proxies are level in Act 1 (68% vs 63%).
- **AI uses the mechanic?** Yes: lane candidates, blocking moves and next-turn setups. It shares the same physics and has no hidden advantages.

## Open issues
- Act 2/3 draw rates of 53–62% for the bot proxy (target ≤35%). The classic roadside table draws about 40% with the same bot, so part of this is the proxy being a weak long-range finisher. A human playtest is needed before changing rules. If draws persist, options are a golden-flick sudden death, or +2 flicks.
- Most Act 1 goals are two-stage (ball through the toll on one flick, finished on the next) and get no hero label. Consider a "PAID THE TOLL" label for that finish.
- Render cost measurements were noisy while playtests loaded the machine. Static plaza meshes are merged (63 → 33 meshes); sustained phone fps is unmeasured.

# Harmattan Haze — departing lorry (same harness, medium bot as player)

| Run | Result |
|---|---|
| Classic Harmattan baseline (no mechanic) | 3 / 3 / 14 draws of 20: the dust (friction ×1.35) is draw-heavy on its own |
| Act 1, lorry-blind player | 60% wins |
| Act 1, lorry-aware player | **82% wins**: reading the next stop is a skill that pays |
| Act 2, 14 flicks | 13–23% wins, 53–70% draws → raised to 18 flicks |
| Act 2, 18 flicks | **30% wins, 27% losses, 43% draws**; 14 of 17 goals carry a lorry label |
| Act 3, 16 flicks | 8% wins, 79% draws → raised to 20 flicks |
| Act 3, 20 flicks | **25% wins, 21% losses, 54% draws**; 16 of 22 goals carry a lorry label |

Open: Act 3 draws remain above target. This is shared with Roadside and needs a human playtest before any sudden-death rule.
