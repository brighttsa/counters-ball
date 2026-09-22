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

# Schoolyard Break — ruler seesaw (same harness)

| Run | Result |
|---|---|
| Classic Schoolyard baseline | 14 / 0 / 6 of 20 (rookie Kwame) |
| Act 1, ruler pinned by caps or ball | 30–40% wins; ~40% of turns frozen → ball swept, caps still pin |
| Act 1, caps still pin | still ~40% of turns frozen (caps rest against the ruler after bouncing) → everything swept |
| Act 1, ball (0.35, 0.12), 8 flicks | 35–40% wins → moved the ball start |
| Act 1, ball (0.5, 0.42), 8 / **10** flicks | 63% / **78%** wins → 10 flicks chosen |
| Act 2 (14 flicks) | 37% wins, 7% losses, 57% draws |
| Act 3 (16 flicks) | 46% wins, 12% losses, 42% draws |

Open: RULER BANK is rare for the bot proxy (about 2 of 69 goals). The ruler mostly acts as a turning obstacle. A human playtest will show whether players bank on purpose.

# Kiosk Corner — change dish (same harness)

| Run | Result |
|---|---|
| Classic Kiosk baseline | 11 / 1 / 8 of 20 |
| Act 1, dish-blind / dish-aware | 55% / **65%** wins; EXACT CHANGE on 14 of 26 goals (aware) |
| Act 2 (14 flicks) | 30–40% wins, 13–17% losses, 47–53% draws |
| Act 3 (16 flicks) | 25% wins, 21% losses, 54% draws |

# Veranda Derby — clay-pot maze (same harness)

| Run | Result |
|---|---|
| Act 1, pot-only bank rule, three pot layouts | ~20–23% wins: every goal needed a cap → ball → pot chain → **rail counts too** |
| Act 1, pot or rail, pots r 0.1, ball (0.72, 0.36) | 35% wins, 65% draws (aware and blind alike) |
| Act 1, ball-start grid; no keeper; 12 flicks | best ~45%; no keeper ~50%; extra flicks change nothing (bot scores early or never) |
| Act 1, **pots r 0.13, ball (1.2, 0.22)** | **55% aware / 40% blind**; 44 goals, rail 24 / pot 20 |
| Act 2 (16 flicks, easy Yaw) | 40% wins, 20% losses, 40% draws; 17 of 18 goals banked off a pot or rail |
| Act 3, medium Yaw | 17% wins, 33% losses → **easy Yaw** |
| Act 3 (18 flicks, easy Yaw) | 40% wins, 13% losses, 47% draws; DOUBLE POT twice |

Open: Act 1 sits just under the 60% target. Bank shots need precision the medium bot's aim noise lacks, and the aware player beats the blind one by 15 points, so reading the pots is a real skill. A human playtest with the aim line decides whether Act 1 needs a closer start. Act 3 uses the same Yaw difficulty as Act 2 and relies on first to 2 plus Yaw's setup habit for the step up.

# Lights Out Final — coin-stack chain (same harness)

| Run | Result |
|---|---|
| Act 1, ball (0, 0), 12 flicks, chain-aware | 43% wins; chain lit in 29 of 30 games by flick ~4; scoring after the unlock is the bottleneck |
| Act 1, chain-blind player | 0% wins: without the beam the bot never finds the order (a human sees the beam) |
| Act 1, ball-start sweep | (0.8, 0.2) 57%; (0.85, 0) 55% with the most LIGHTS ON goals; (0.95, 0.15) 37% |
| Act 1, **ball (0.85, 0), 14 flicks** | **62% wins**; LIGHTS ON 6, OFF THE COINS 3 of 37 goals |
| Act 2 (20 flicks, easy Magic) | 37% wins, 10% losses, 53% draws; both sides light their chains (51 LIGHTS ON in 30 games) |
| Act 3, medium Magic | 6% wins, 44% losses → **easy Magic** |
| Act 3 (24 flicks, easy Magic) | 29% wins, 4% losses, 67% draws |

Open: Act 2–3 draws are high here too: both chains open, then neither bot finishes. Same finishing weakness seen at every venue; needs a human playtest before any sudden-death rule. LIGHTS ON is rare for the bot (it lights with a cap, then shoots next flick).
