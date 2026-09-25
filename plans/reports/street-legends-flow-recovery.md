# Street Legends flow recovery

## Implemented
- Historical note: this report was written when Act 1s were solo discovery
  tables. Street Legends now uses live rookie rivals in every act; Kwame's
  Corner is the dedicated solo practice lane.
- The mechanic-specific NEXT FLICK cue remains available only for legacy solo
  tables. It does not reveal an exact aim or repeat after every shot.
- An Act 2 loss or draw gives one venue-specific next-try decision on the
  full-time card. Wins, Act 3 results, Classic and 2-Player copy are unchanged.
- No flick budgets, collision rules, AI tactics, unlocks or tiebreaks changed.
  The current rules already grant a golden flick and then two extra flicks
  each before a genuine draw; the older bot-proxy draw figures predate or do
  not establish the human experience of this rule.

## Verification
- Six venue cues are distinct; Act 2 loss/draw/win and Act 3 copy have tests.
- Full suite: 195 pass; all source syntax and diff checks pass.
- Real Schoolyard Act 1 flick on port 4181: 10 to 9 flicks, score 0-0, next
  turn announced NEXT FLICK with the ruler cue. At 390x844, HUD layout check
  found no clipped or overlapping controls. Browser logged the existing
  unattributed MutationObserver diagnostic.

## Human playtest still required
Use the current local build. Ask at least three first-time players to play
Schoolyard Act 1 then Act 2, and three players to try one harder pair
(Veranda or Jamestown Acts 1-2). Do not explain the mechanic before play beyond
the game's own intro. Record per act: first valid ball contact, first goal,
flicks used, loss/draw/win including tiebreak stage, retries, and whether the
player starts another match voluntarily. After the first miss and after full
time, ask: "What would you try differently next?" Note whether the answer
names the mechanic, not only shot power. Watch whether the cue appears during
active aim or hides a cap. Compare Act 2 improvement on the next attempt
before changing budgets or adding help. A bot proxy cannot answer these
questions; leave the balance decision open until people play it.
