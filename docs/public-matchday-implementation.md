# KONK Matchday: casual public matchmaking

## Implemented locally

- Play Live exposes Find a Rival alongside existing private rooms and knockout.
- One FIFO queue pairs real players at the canonical Schoolyard venue.
- Both seats ready up before the existing authenticated WebSocket match begins.
- Search tickets are opaque secrets stored in sessionStorage when available.
- Search retry reuses the same ticket; cancellation invalidates delayed joins.
- A cancellation that races with assignment recovers the assigned room instead
  of abandoning the other player silently.
- Waiting leases expire after 20 seconds without polling; assignments and
  cancellation tombstones expire after two minutes.
- The queue Durable Object serializes assignment and keeps seat tokens private.
- Public match seats cannot be reclaimed by someone with only the room code.
- Queue size, retained records and short-lived client request rates are bounded.
  Client rate keys use a digest of Cloudflare's supplied IP, never raw addresses.
- No invented opponents, ranks, player counts, rewards or matchmaking ratings.
- Completed casual turns retry after transient network/server failure. Per-turn
  receipts acknowledge identical retries even after the rival moves or full time.
  Seat authentication and exact-content checks still apply to every retry.
- Leaving a public pairing before kickoff cancels it for both players and offers
  the remaining rival another search. Cancelled lobbies cannot be readied again.

## Verification

32 focused transport/queue/room/tournament/turn-delivery tests pass. Two independent
desktop and mobile browser contexts recovered a dropped search request, cancelled
and searched again, paired, left before ready-up, and paired again. Both completed
30 actual flicks through the golden/extra-flick tiebreak to matching full-time
state on the server. A failed turn POST and a server-accepted turn with a lost HTTP
acknowledgement recovered without page errors. Screenshots were inspected
at 1280 x 800 and 390 x 844. Full local suite: 382 passed, four existing failures
in native release identity, Apple touch-target, stylesheet ordering and native
loading-overlay contracts. Those unrelated tests were not weakened.

Preview requires both the static server at localhost:4181 and
`npm run dev -- --local` in match-server (localhost:8787).
Repeat the browser regression with Playwright available to Node:
`node scripts/verify-public-rival-matchmaking.mjs` (Google Chrome on macOS).
Syntax checks for all src and match-server JavaScript and diff whitespace pass.

## Intentionally deferred

Persistent recoverable player profiles, ranked score verification, skill-based
matchmaking, seasonal/friends leaderboards, weekly cup rewards and automatic
forfeit adjudication remain separate work. Casual FIFO does not claim to match
skill. Public matches reuse the current turn-result transport, not a new
server-authoritative physics engine. Search recovery is not full match recovery
after a page reload. Physical-device/network-loss playtesting and an isolated
web/Worker deployment are still required before public release.
