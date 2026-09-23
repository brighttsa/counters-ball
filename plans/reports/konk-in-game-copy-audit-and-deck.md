# KONK! in-game copy audit and approval deck

Status: proposal only, 2026-09-23. No player-facing strings have been changed.
Approval of this deck is required before implementation. `Keep` means the existing
text is already doing its job; variables in braces are runtime values, not literal copy.

## Audit

The strongest existing writing is local: the schoolyard toffee bet, Esi at the
kiosk, Auntie Ama's pots, the Tema booms, the departing lorry, and Magic's
padlocked goal. Preserve all venue names, places, opponents, act titles, and
mechanical conditions. The weaker layer is global: `You win!`, `Nice flicking.`,
`Yours.`, `Draw!`, and the same `GOAL` treatment at every intensity. The first-shot
hint is useful but wordy. Some results text is longer than a phone needs.
The Roadside conditions label can say `Open table` despite toll booms; that is
a factual UI problem, not a voice problem.

The shipped multiplayer is local 2-Player Table, share cards, and honor-system
challenge links. There is no live online match, account, chat, or matchmaking
copy to rewrite. There is no dedicated near-miss event; do not fake one from
ordinary wall or post contacts. Loading is mostly the browser's native loading
of modules/assets, with a JavaScript/WebGL fallback, not a loading screen.

## Voice guide

KONK! is a friend at the edge of the table: attentive, competitive, amused by
how much pride fits on a tiny pitch. Write from the physical action (cap, ball,
rail, pot, post, lane, goal), not generic victory language. One sharp image or
observation beats a joke. No invented Ghanaian expressions. Name the actual
place and person where context warrants it; do not paste place names into every
HUD message. Use sentence case for support text, all caps only for short
broadcast callouts. One exclamation mark is plenty, usually zero.

Clarity wins in controls, accessibility, rules, errors, and destructive actions.
Keep buttons to 1-3 words when the destination is obvious. Keep in-match
callouts to 1-3 words plus at most one short detail, one lane at a time. A
routine cap tap gets sound, not prose. A goal earns a line; a proven bank,
sweet spot, or venue feat may earn a rarer line. Losses should name the next
decision, never shame the player. Accessible names should be literal even when
the visible label has character.

## Global UI deck

| Screen/event | Existing | Proposed | Why |
|---|---|---|---|
| Home tagline | Tiny pitch. Big moments. | Small pitch. Big mouth. | Stronger KONK! signature; use once on home, not repeatedly. |
| Featured label | Street Legends · featured mode | Street Legends · featured | Shorter; still identifies mode. |
| Featured button | Play {venue short name} | Play {venue short name} | Keep: destination is useful. |
| All acts | All 18 acts → | See all 18 acts | Clear action; number is accurate. |
| Classic mode | Classic Campaign | Classic Campaign | Keep established mode name. |
| Local mode | 2-Player Table | 2-Player Table | Keep; do not imply online play. |
| Circuit heading | The Circuit | The Circuit | Keep established label. |
| Circuit entry | Enter match → | Play this match | More immediate and clear. |
| Locked card | Locked | Locked | Keep. |
| Locked note | Win Act {n} to enter this act. / Win match {n} to enter this venue. | Win Act {n} to unlock. / Win match {n} to unlock. | Shorter, same condition. |
| Intro back | Pitches | Pitches | Keep. |
| Intro start | Kick Off | Kick off | Action, no forced headline case. |
| Intro 2-player support | Two players, one table. Take turns on the same screen. | Two names. One table. Take turns on this screen. | Reinforces named seats and local play. |
| Challenge kicker | A friend sent you a challenge | Your friend left a mark | Has rivalry without promising live play. |
| Challenge title | Beat this mark | Beat this mark | Keep. |
| Challenge actions | Not now / Take it on | Later / Play their table | Short and concrete. |
| Star total | {n} of {max} stars collected | {n}/{max} stars | Compact on phones. |
| Empty star total | Six pitches. Six neighbourhood legends. | Six pitches. Six stories to settle. | More active; do not imply all unlocked. |
| Conditions: empty | Open table | No fixed obstacles | Roadside's moving booms must not be described as open. Show mechanic in objective. |
| Conditions: obstacles | {n} obstacles | {n} fixed obstacles | Distinguishes fixed props from moving venue pieces. |
| Light labels | Midday sun / Late afternoon / Golden hour / Harmattan dust / Under the bulb | Keep | Useful location texture, brief. |
| Default versus rule | First to {n} goals · {n} flicks each | First to {n} goals · {n} flicks each | Keep, accurate. |
| Generic rules | Obstacles on the table: play the rebounds | Obstacles are in play. Bank if you can. | Shorter; avoid implying a bank is required. |
| Dust rule | Dusty surface: caps stop sooner | Dust slows the caps. | Direct mechanic. |
| Star rules | Win / Keep a clean sheet / Win within {n} flicks | Win / Concede no goals / Win in {n} flicks or fewer | Clearer, exact threshold. |
| Orientation heading | A wider view of the game. | Better in landscape | Plain, useful. |
| Orientation detail | Turn your phone or tablet sideways for landscape play. | Turn your device sideways for more room to aim. | Explains benefit. |
| Orientation actions | Play in portrait / Back | Play in portrait / Back | Keep portrait choice explicit. |

## Match, controls, and feedback deck

| Screen/event | Existing | Proposed | Variants / guardrail |
|---|---|---|---|
| First-shot hint | Drag back from your cap · let go to flick | Drag back from a cap. Release to flick. | Preserve pull-back direction. |
| Solo turn | Your flick | Your flick | Keep. |
| AI turn | {opponent} is lining up… | {opponent} lines up | No ellipsis-laden waiting if AI acts quickly. |
| Local turn | {name} to flick / {NAME}'S FLICK · Pass it over | {name}'s flick / {NAME}'S FLICK · Pass it over | Keep handover clear. |
| Flick counter | flicks left | flicks left | Keep; screen-reader labels stay `Home/Away: {n} flicks left`. |
| Ordinary goal | GOAL · Yours. / {opponent} scores | GOAL · That one was yours. / {opponent} answers. | Rotate home: `In it goes.`, `Right through.`, `That angle paid off.`; away: `{opponent} found the gap.`, `{opponent} gets one back.` Only select facts supported by score. |
| Goal score/location suffix | {detail} / {score} / {place} | {detail} · {score} | Venue is already identified in intro; trim in-match overlay. |
| Proven sweet spot | SWEET SPOT | SWEET SPOT | Rare alternate detail: `Clean as a whistle.`; no pre-shot praise. |
| Proven bank | BANK | OFF THE RAIL / BANK | Use `OFF THE RAIL` only when contact type is known; otherwise `BANK`. Alternate detail: `Used every inch.` |
| Proven counter | COUNTER | COUNTER | Alternate detail: `Turned it round.` |
| Proven street play | STREET PLAY | STREET PLAY | Let venue-specific hero labels take precedence. |
| Match point | MATCH POINT | MATCH POINT | Keep, internationally legible. |
| Golden tiebreak | GOLDEN FLICK · One flick each. Next goal wins. | GOLDEN FLICK · One each. Next goal wins. | Mechanical meaning untouched. |
| Extra tiebreak | TWO MORE EACH · Still level. Two more flicks each. | TWO MORE EACH · Still level. Two flicks each. | Mechanical meaning untouched. |
| Replay | Replay / Skip replay → | Replay / Skip replay | Clear, short. |
| Full-time banner | WINNER / FULL TIME | WINNER / FULL TIME | Keep; result screen supplies personality. |
| Camera controls | Camera, Tactical peek, Tactical, Broadcast, Street Level, Free Camera, Reset camera | Keep | These are control names, not places for jokes. |
| Camera notices | Aim cancelled. No flick used. / Camera reset. | Keep | Essential reassurance and accessibility. |
| Pause controls | Paused / Resume / Restart Match / Camera motion / Scoreboard / Quit to Pitches | Keep, except `Restart Match` → `Restart match` | No comedy in destructive navigation. Confirm action separately as UX work. |
| WebGL fallback | KONK! needs JavaScript and WebGL. | KONK! needs JavaScript and WebGL to run. | Complete next-step meaning; add browser-help link only if one exists. |

Goal variants should rotate without immediate repetition and only on a real
score. Do not call a shot `impossible`, `lucky`, `perfect`, or `comeback` without
data proving it. Proposed near-miss lines (`So close.`, `The post had a say.`)
are **not approved runtime copy** until a reliable goal-line/post event and
cooldown exist. Silence is preferable to false commentary.

## Results, rivalry, sharing

| Screen/event | Existing | Proposed | Why |
|---|---|---|---|
| Results kicker | Full Time | Full time | Keep. |
| Solo win | You win! | That's yours. | Match-scale pride, less stock. |
| AI win | {opponent} wins | {opponent} takes it | Competitive, not insulting. |
| Local win | {name} wins! | {name} takes it. | Seat name stays prominent. |
| Draw | Draw! | Nothing between you. | Leaves room for rematch. |
| Classic final | Champion of the tables! Every pitch conquered. | Every table settled. For now. | Less generic; still marks completion. |
| Classic improved | New best on this pitch! | New best on this table. | Specific. |
| Classic ordinary win | Nice flicking. | Made that one count. | Less filler. |
| Street Legends final act win | Street Legend of {place}! | {place} knows your name now. | Place-led; check long place wrapping on phone. |
| Street Legends Act 1/2 win | {opponent} gives you the table. Next act unlocked. | {opponent} steps aside. Next act unlocked. | Keeps progression explicit. |
| Solo out of flicks | Out of flicks. Read the table and set the ball up for it. | Out of flicks. Set up the next angle. | Short and actionable. |
| Draw note | Level on goals: you need a win for stars. | Level on goals. Win the rematch to earn stars. | Explicit rule, no blame. |
| AI loss note | {opponent} keeps the bragging rights. Run it back. | {opponent} keeps the table. Run it back. | Grounded in the match. |
| Act 2 retry | Next try: {venue retry cue} | Next shot: {venue retry cue} | Preserve mechanic-specific cue; show on retry screen, not over pitch. |
| Result actions | Replay / Next Act / Next Pitch / Share / Pitches | Play again / Next act / Next pitch / Share / Pitches | `Play again` only for solo; local remains `Rematch` or `New series`. |
| Local series | GAME {n} · First to 2 wins / {name} takes the series / Series level at {score} | Game {n} · First to 2 wins / {name} takes the series / Series level at {score} | Keep rule and outcome literal. |
| Head-to-head | First meeting / All time: {record} | First meeting / All time: {record} | Keep; useful context. |
| Challenge verdict: beat | You beat your friend's mark… | You beat their mark. | Preserve displayed score and flick comparison. |
| Challenge verdict: tied | Dead level… | Same mark. Different match. | Only when comparator reports exact tie. |
| Challenge verdict: short | Your friend's mark stands… Run it back. | Their mark stands. Run it back. | Invites rematch. |
| Share card kicker | KONK! · FULL TIME | KONK! · FULL TIME | Keep branded result context. |
| Solo share text | I beat {opponent} in {n} flicks at {venue} in KONK! Beat that: {link} | {opponent} gave me a game at {venue}. I won in {n} flicks. Your turn: {link} | Preserve honest outcome and score URL. Other outcomes need factual separate templates. |
| Local share text | {winner} beat {loser} … at {venue} in KONK! | {winner} took the table from {loser} at {venue}. KONK! | For draws: `{names} couldn't split the table at {venue}. KONK!` |
| Share footer | One table. Two players. Loser sets up the caps. / Your move. Tap the link to take the same table. | One table. Two players. Settle it again. / Same table. Your move. | Avoid making the loser do a chore. |
| Share status | Shared. / Card saved. Message and link copied. | Shared. / Card saved. Message and link copied. | Keep factual OS feedback. |

Never infer online play from a challenge link. If a share action fails, show
the actual failure and retain a usable copy/download fallback. Do not say
`Shared` until the platform confirms success.

## Classic campaign: six venue blurbs

Names and places are **unchanged**. These are the short pre-match stories, not
new rules. Each proposed line stays tied to the source location.

| Venue / opponent | Existing | Proposed |
|---|---|---|
| Schoolyard Break / Kwame | Kwame bet his toffee you can't score before the bell. | Kwame put his toffee on it. Score before the bell. |
| Kiosk Corner / Esi | Esi plays every evening by Kofi's kiosk. She knows the table. | Esi knows every mark on Kofi's table. You get one shot at surprising her. |
| Veranda Derby / Yaw | Pebbles on the plywood. Yaw banks shots off them like a pro. | Yaw calls the banks before they happen. The pots might have other ideas. |
| Roadside Showdown / Akosua | Somebody left a bottle and their change on the table. Play around it. | A bottle and loose change have claimed the middle. Akosua wants the rest. |
| Harmattan Haze / Abdul | Dust on everything. The caps drag — flick harder than you think. | Dust slows the caps. Abdul already knows how much. |
| Lights Out Final / Kofi "Magic" | Kofi "Magic" has never lost under this bulb. Tonight, somebody will. | Magic owns the table under this bulb. The next match decides whether he keeps it. |

## Street Legends: all 18 act cards

Act titles, venue names, objectives' required actions, flick budgets, and
win conditions stay fixed. `Current` is the card blurb; `Proposal` is its
replacement. The separate objective column records an exact existing-to-new
instruction where a change helps; `Keep` means no change. Intro sequences
remain factual and should receive only line-level tightening during approved
implementation, never a different mechanic.

| Venue / act | Current blurb | Proposed blurb | Objective current → proposed |
|---|---|---|---|
| Schoolyard / Before the Bell | Somebody stood a ruler up in the eraser. Every flick it turns. Kwame says you can't bank off it. | A ruler in an eraser. It turns every flick. Kwame reckons you can't use it. | Score past the turning ruler → Keep |
| Schoolyard / Ruler Rules | Kwame bets his toffee again. He shoots straight at the ruler every time. | Kwame's toffee is back on the line. He still shoots straight at the ruler. | Beat Kwame round the ruler → Beat Kwame around the ruler |
| Schoolyard / Last Bell | Break is nearly over. First to two keeps the toffee, and the whole class is watching. | The bell is close. First to two keeps the toffee. The class is watching. | First to 2 before the bell → Keep |
| Kiosk / Exact Change | Kofi stood his change dish in front of the goal. Every flick it turns. Find the gap. | Kofi's change dish guards the goal. It turns every flick. Find the gap. | Score through the gap in the dish → Keep |
| Kiosk / Rush at the Hatch | Customers queue at the hatch. Esi plays between sales, and she never rushes a shot. | A queue at the hatch. Esi has time for one more shot, and she won't rush it. | Beat Esi through the dish → Keep |
| Kiosk / Closing Time | Kofi is pulling the shutter down. One more game, first to two, for the last Fan Milk in the freezer. | Shutter's coming down. First to two gets the last Fan Milk. | First to 2 before the shutter comes down → Keep |
| Veranda / Auntie Ama's Rule | Her pots are on the table and she is watching from the doorway. Straight goals don't count here. | Auntie Ama is watching from the doorway. Her pots are in play. Straight goals don't count. | Score a bank goal: off a pot or the rail → Keep |
| Veranda / Mind the Pots | Yaw learned banking on this veranda. He knows every pot by name. | Yaw knows the name of every pot. He also knows where the ball lands next. | Beat Yaw with bank goals → Keep |
| Veranda / The Derby | Golden hour, the whole compound watching. First to two before Auntie Ama calls everyone in to eat. | The whole compound is watching. First to two before Auntie Ama calls everyone in. | First to 2, bank goals only → Keep |
| Roadside / Green Means Go | Rush hour at the toll plaza. Every flick one boom drops — green lanes are open, amber is about to shut. | Rush hour. One boom drops every flick. Green is open; amber is next to close. | Score through the toll → Score through an open toll lane |
| Roadside / Rush Hour | Akosua collects tolls for her uncle. She knows which boom drops next — and parks a cap in the lane you need. | Akosua knows which boom drops next. She has a cap waiting in your lane. | Beat Akosua through the booms → Keep |
| Roadside / Last Toll Before the Motorway | Somebody parked a bottle in the road. Akosua wants a rematch, and she is not collecting coins tonight. | A bottle blocks the road. Akosua wants a rematch, not your loose change. | First to 2 at the junction → Keep |
| Harmattan / Catch the Lorry | The Bolga Express is pulling out, and the goal is strapped to its side. Read where it stops next. | The Bolga Express is moving. A goal is strapped to it. Read the next stop. | Score into the moving lorry → Keep |
| Harmattan / Loading Bay | Abdul loads sacks for his father between games. He always knows where the lorry is going. | Abdul loads sacks between matches. He knows where the lorry stops before you do. | Beat Abdul to the lorry → Keep |
| Harmattan / Last Lorry to Bolgatanga | Dust on everything, pebbles in the road and one lorry left tonight. Abdul wants the ride. | Dust, pebbles, one lorry left tonight. Abdul wants that ride. | First to 2 before the last lorry leaves → Keep |
| Jamestown / Light the Bulb | Magic padlocks his goal every night. Three coin stacks and the lighthouse beam hold the key. | Magic padlocked his goal. Light three coin stacks in the beam to open it. | Light all three stacks, then score → Keep |
| Jamestown / Magic's Table | Magic has never lost under this bulb. He is already lining up his stacks. | Magic hasn't lost under this bulb. His first stack is already lined up. | Light your chain before Magic lights his → Keep |
| Jamestown / Lights Out | The whole of Jamestown is at the kiosk. First to two, and the bulb goes out after every goal. | Jamestown is at the kiosk. First to two; the bulb resets after every goal. | First to 2 · relight the chain after every goal → Keep |

## Venue-specific live cues

Keep these mechanically literal and one at a time. The current retry cues
already solve a real comprehension problem; most need no rewrite.

| Mechanic | Existing retry cue | Proposed |
|---|---|---|
| Ruler | Check the ruler now; the chalk previews its next angle. | Check the ruler. Chalk shows its next angle. |
| Dish | Shoot through the dish gap that is open now. | Use the gap that's open now. |
| Pots | The ball must touch a pot or rail on the scoring flick. | A goal counts only after a pot or rail touch on that flick. |
| Tolls | Choose a green lane; amber closes on your next turn. | Green is open. Amber closes next turn. |
| Lorry | Shoot at the lorry now; the ghost goal marks its next stop. | Aim at the lorry now. The ghost marks its next stop. |
| Coins | Light the stack in the beam before aiming at the lock. | Hit the stack in the beam before the locked goal. |

Keep venue hero labels such as `RULER BANK`, `EXACT CHANGE`, `OFF THE POT`,
`DOUBLE POT`, `OFF THE RAIL`, `LAST STOP`, `LIGHTS ON`, and `OFF THE COINS`.
They name a proven feat, are short, and belong to a particular place. Do not
rotate them into unearned generic praise.

## Act intro inventory

These are the current tutorial beats, in source order. Proposal for every
entry here is **Keep** unless the change after the arrow is specified. They
teach real mechanics; removing one for style would be a regression. Numeric
first lines are generated from rules and remain exact.

| Act | Existing intro beats after the numeric rule | Proposed |
|---|---|---|
| Schoolyard 1 | Ruler turns 45° every flick: open/slanted/across/slanted back; chalk shows next angle; anything in its way is swept aside | Keep; `Anything in its way gets swept aside as it turns, so read where the ball will end up` → `The turn sweeps caps and ball aside. Watch where they settle.` |
| Schoolyard 2 | Line up for ruler's NEXT angle; your ruler turns too; across is a wall/open a highway | Keep; `NEXT` → `next` for screen-reader cadence. |
| Schoolyard 3 | Goal off ruler earns RULER BANK; across wall/open highway | Keep. |
| Kiosk 1 | Dish cycles open left/edges/right/edges; chalk arc previews next cover; score with edges open for EXACT CHANGE | Keep. |
| Kiosk 2 | Set ball up for gap's NEXT position; your dish turns too | Keep; `NEXT` → `next`. |
| Kiosk 3 | Rattle dish and score for OFF THE DISH; Esi is sharper tonight | Keep. |
| Veranda 1 | No straight goals; ball must bounce off pot/rail on scoring flick; straight goal waved off; big-pot glance | Keep. |
| Veranda 2 | Leave ball for a pot to turn into their goal, not yours | Keep. |
| Veranda 3 | Two pots yields DOUBLE POT; Yaw sets up banks | Keep. |
| Roadside 1 | Green boom up/red down; amber closes next flick; caps pass under booms, ball cannot; ball under boom jams it open | Keep; split long last line visually if narrow. |
| Roadside 2 | Set ball in lane still green next shot; park cap in her lane; caps slide under, ball cannot | Keep. |
| Roadside 3 | Bank off lowered boom/jam gate/thread green lane; bottle in middle | Keep. |
| Harmattan 1 | Lorry moves one stop per flick; ghost previews next and turns at ends; keeper stays | Keep. |
| Harmattan 2 | Line up with goal's NEXT stop; your own goal moves, defend its future position | Keep; `NEXT` → `next`. |
| Harmattan 3 | Dust slows caps; far-stop goal earns LAST STOP | Keep. |
| Jamestown 1 | Strike beam-lit stack with ball/own cap; three lit drops padlock; final stack and goal on same flick is hero | Keep. |
| Jamestown 2 | Both goals padlocked; white beam yours/gold Magic's; avoid leaving ball by his next stack | Keep. |
| Jamestown 3 | Bulb goes out after your goal; relight chain; Magic plans two turns ahead | Keep. |

The live mechanic `describe()` strings should remain informational at launch:
lane colour and next boom, dish/ruler angle, lorry stop and ghost, pot/rail
requirement, and beam/stack progress are state-dependent, not reaction copy.
Approved implementation should centralize their reusable labels while leaving
their changing numbers/directions with the mechanic owner.

## Implementation and acceptance after approval

Use small copy modules by ownership (global UI, match reactions, results/share)
and keep venue-specific story/rule text with the level definitions or a nearby
level-copy module. Do not create one giant file over the repo's 200-line code
limit. Preserve save keys, element IDs, accessibility semantics, and gameplay
events. Use a deterministic no-immediate-repeat selector for proven goal
variants; no extra text on routine taps. Audit every rendered string again
after implementation, including mechanic `describe()` lines and 18 intro
sequences. Browser-check 320/375/390/430px portrait, 844x390 landscape,
tablet, and desktop for overflow, live-region cadence, focus, and readable
controls. Test result branches (solo win/loss/draw, series, challenge verdict,
stars, tiebreak), WebGL fallback, and share fallbacks. No new near-miss reaction
or online-multiplayer promise without separate feature approval.
