# Server-Authoritative Classic Room Protocol

## Status

Released for new private classic-venue rooms after owner web-to-phone testing.
Existing legacy rooms, Rival and four-player knockout retain their letter protocol.
No ratings or rewards are awarded yet; this is not a ranked launch.

## Trust Boundary

With `SERVER_SIMULATION_ENABLED=true`, create a duel room with
`{levelId,homeName,simulation:"server-v1"}`. Only the six actual classic venue
IDs are accepted. Street Legends, tournaments and unknown simulation versions
are rejected. Creation does not let the browser choose physics or rules.

Join and ready-up use the existing seat protocol. Saved profile credentials
are verified at ready-up; guests remain allowed. After both players ready:

- `GET /rooms/:id/shot`, Authorization Bearer seat token, returns the canonical
  opening or latest checkpoint and the room epoch as `matchId`.
- `POST /rooms/:id/shot` accepts only `token`, `matchId`, `requestId` (32 hex
  characters), `seq` (current checkpoint sequence), `cap` (0–9), `vx`, `vz`.
- No client score, table position, rule snapshot, winner or physics settings
  are accepted. The authenticated seat must own the cap and current turn.
- An accepted shot returns the next checkpoint. WebSockets broadcast an
  `authoritative-shot` event, never a client-authored outcome.
- Legacy `/turn` commands are refused in server-authoritative rooms.

The current MAX_FLICK_SPEED and permitted 8% gesture boost bound velocity.
The shared game's fixed-step physics runs at 1/240 s, with a 12-second simulation
ceiling. An unsettled shot is rejected, not silently truncated or credited.
The shared MatchRules handles budgets, own goals, conceder kickoff, golden
flick, extra flicks, draws and full time. Rendering/replay timing has no authority.

## Persistence And Retry

The Durable Object concurrency lock covers read, simulation and commit.
One storage put writes the checkpoint, request receipt and room phase together.
Same request ID, seat and intent returns the original acknowledgement even
after later turns. Changed retries or stale sequences return 409.
The room epoch prevents a command from an old match applying to a new one.
Final `room:verified-result` records the server result and bound participant
profile IDs; `rated:false` prevents treating this as ranked settlement.
Credentials and profile IDs are not included in snapshots or broadcasts.

## Browser Integration Gate

Server-v1 uses uniform CAP_RADIUS collision bodies, the shared formation and
venue friction, plus actual goalposts and obstacle definitions. The legacy
renderer randomizes cap scale, including its collision radius. This protocol
therefore returns body radii and authoritative checkpoints: a new browser
controller must adopt both, not replay legacy snapshots and assume parity.
Cap visual imperfection may remain cosmetic while competitive radii are fixed.

The browser controller now submits shot intents, shows pending state, replays
server-sampled trajectories and contact feedback, adopts canonical radii,
deduplicates HTTP/WebSocket acknowledgements and recovers from server state.
Private classic room creation uses server-v1 on konk.world, or in local previews
with `?serverMatch=1` and an enabled local Worker. Public Rival,
tournaments and production room creation retain their existing protocol.
Check real two-client matches, goals, retries, disconnects and mobile latency
before enabling the flag or adding ranked matching. Then implement idempotent
rating settlement. Do not rate legacy letters or enable this for unsupported
Street Legends mechanics or knockout brackets.

## Verification

Focused tests cover six venue openings, deterministic simulation, immutable
input state, goals, conceder kickoff, settlement, illegal shots, fake outcomes,
seat authentication, stale match identity, duplicate/conflicting receipts,
legacy-room isolation and a complete 30-shot regulation/tiebreak draw.
Cloudflare local Worker checks additionally exercise routing, feature flags
and simultaneous same-sequence submissions under a real Durable Object lock.
No physical-device latency or production load certification is implied.

Browser integration regressions cover pending-input locks, same-ID retries,
duplicate/out-of-order acknowledgements, recovery after failed playback,
canonical collision radii, paused trajectory playback and abandoned-session
cleanup. Two actual browser origins exchanged a shot each and agreed on both
flick counts and turn ownership; a challenger reload recovered that checkpoint.
Browser goals, interrupted connections and physical-device testing remain gates.

The owner subsequently confirmed web-to-phone turn/position parity, goals,
same winner/final score, reload recovery, shared rematch after its fix, network
recovery and satisfactory responsiveness. The release suite has 541 passing tests.

Automated two-session integration now verifies complete scoreless matches in
all six venues, including golden/extra tiebreaks and exactly-once full time.
Winning and non-winning goal paths reconcile score, result or conceder kickoff
and emit one goal feedback per client. A response lost after commit retries the
same intent without spending another flick; the opponent restores a missed
broadcast through a checkpoint refresh and continues. These tests use actual
session/physics/controller code with fixture rendering and network transport;
they do not replace real-browser full-match or physical-phone latency checks.
