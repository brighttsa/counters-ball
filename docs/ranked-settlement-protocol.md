# Ranked Settlement Foundation

Status: implemented and tested locally; not deployed or enabled. Casual private
rooms, guests, public casual Rival and tournaments award no rating. Ranked entry,
matchmaking and standings exist behind the release flag.

## Internal Contract

One named ranked coordinator must own all reservation and settlement requests.
Its Durable Object concurrency lock surrounds each operation. No Worker public
route forwards to these internal endpoints. The feature requires the explicit
`RANKED_SETTLEMENT_ENABLED=true` flag and a published Monday UTC season anchor
in `RANKED_SEASON_ANCHOR`; neither is configured in production.

- `POST /internal/ranked/reserve`: `{roomId,matchId}`.
- `POST /internal/ranked/settle`: `{roomId,matchId}`.

The coordinator resolves the canonical room/receipt from that room's Durable
Object via an internal source read. Submitted scores, winners, profile identities
and rating deltas are never used. Source reads omit seat and recovery credentials.
A future trusted ranked queue must install a server-v1 matchmaking room, bind
two distinct verified profiles and pin `room.ranked={kind:'ranked',startedAt}`
before reservation and kickoff. Ordinary private rooms cannot register.

## Rules

Elo starts at 1000; K=24, symmetric fractional changes, draws score 0.5. Margin
does not affect rating. Placement requires five results and three distinct
opponents per season. Opponent tracking stores only the three needed IDs.
Eligibility consumes a daily opponent-pair slot before play, capped at two;
subsequent encounters are explicitly unranked. Each profile has one active
ranked reservation. Starting a new season soft-resets the prior season rating
to `1000 + .5*(rating-1000)` and resets placement counters.

Both ratings, placement statistics, released active seats, pending-season count
and the consumed receipt are committed in one multi-key atomic storage put.
Duplicate receipts return the stored result; changed outcomes conflict. Failed
writes are retryable without applying either player's delta. New-season rating
initialization waits for previous-season reserved receipts to finish settling.

Seasons last 28 days. A registered match is pinned to its original season and
has ten minutes beyond cutoff to finish. Later completion is void, not rated,
and releases active seats. Verified completion time is persisted by the server.

## Security Review

The ranked API accepts a profile ID only as a lookup hint; the saved-profile
secret is checked by the profile Durable Object before the ID enters a queue,
standing request or player rate counter. Queue names and ratings are derived from
that verified profile and the settlement ledger reads the match receipt from the
room Durable Object. Clients cannot submit ratings, scores or winners. Internal
coordinator endpoints are not routed from public API paths. Seat tokens stay out
of standing and queue records.

Ranked request counters use SHA-256 of the source IP and verified profile ID,
short fixed windows, bounded counters, and expiration alarms. Invalid credentials
are rejected before a player-specific counter is consumed. Existing profile
request throttling remains in place. Browser-origin checks protect ranked search
and profile verification; standings responses are private-cache disabled.

No critical issue found in the reviewed route, identity, result, timer and quota
paths. This was a code inspection plus the listed automated/local checks, not an
independent penetration test. Physical two-device testing remains a release gate.

## Remaining Release Gates

Completed ranked results now persist `room:ranked-outbox` in the same write as
the authoritative checkpoint and verified receipt. Alarm delivery resolves only
room/match identities through the coordinator, with bounded exponential retries.
Delivery runs outside the room lock because the coordinator reads the room's
receipt. Lost acknowledgements safely redeliver; stale epoch acknowledgements
cannot clear a newer job. Duplicate shot retries repair pending alarm scheduling.
The opt-in queue now produces ranked rooms behind the disabled release flag.

The disabled HTTP `/standings` and `/standings/me` reads now expose indexed,
paginated standings. Personal reads authenticate saved profile credentials;
public reads cannot request personal data. Credentials never enter the ledger
request. Both routes are rate-limited and use no-store responses. Ranked reads and
search use separate hashed-network budgets (6,000/minute) and verified-player
budgets (60/minute); profile verification retains its existing 30/minute network
limit. A player's ranked budget is charged only after credentials are verified.

The `/ranked/search` endpoint verifies saved profile credentials and derives names
from the authenticated profile. SQLite searches enforce one pending search per
profile without a fixed admission cap. Skill windows widen from 150 to 700 rating
points as both players wait. Selected pairings persist their room and seats before
installation/reservation; retries and queue alarms recover the same epoch. Seat
tokens are withheld until the coordinator reserves eligibility. Rejected pairings
are blocked explicitly, never silently downgraded to casual. Queue polling should
use at least four-second intervals; its budget is independent of profile requests.

Ranked rooms activate their watchdog only after eligibility reservation. Lobby
expiry is 90 seconds from activation. Both ready players start a 60-second turn
clock; subsequent turns allow replay/goal presentation time before that clock.
Missing presence suspends the clock, and returning players resume its remaining
time. A player absent for 90 seconds forfeits only while the other is online;
both absent for 90 seconds voids the match. Ended/cancelled decisions cannot repeat.
Alarms and incoming ready/heartbeat/shot/socket actions adjudicate under the room
lock before accepting gameplay mutations. Normal casual/private rules are unchanged.

Forfeits persist a canonical ended checkpoint, verified receipt and settle job in
one write. Voids and lobby departure persist cancellation and a release job;
cancelled-lobby retries do not reset delivery attempts. Delivery uses the existing
outbox outside the room lock. Failed alarm writes are repaired by later access.
The public ranked snapshot exposes only policy/deadline metadata, not credentials.
The turn deadline, server time and suspended-clock state appear in the existing
flick counter row; the client timer is visual only. Results explain turn-timeout
and reconnect forfeits explicitly.

Season closure now indexes pending reservation cutoffs and checks canonical room
records after the grace boundary. Existing timely receipts settle; unfinished
rooms cancel and release profile locks. Unreachable/stale rooms retain their
reservations and retry. Small round-robin batches keep network waits below the
coordinator lock timeout. Registration retries recover prior reservations even
after cutoff, without opening a new registration window. Earlier scheduled
closure alarms are preserved when later reservations are added.

The real `/standings/` browser board now supports season selection, paginated
results, own placement progress and loading/empty/unavailable states without
fictional players. Its ranked entry opens `/play/?ranked=1`, uses separate search
tickets, verifies saved profiles, polls every four seconds and discloses timeout
rules before ready-up. Ranked rematch returns to ranked search, not private rematch.
Next-season provisional reads use the same soft reset as settlement and wait for
previous-season pending results. Casual entry and private rooms remain unchanged.

Local Worker black-box verification: two disposable local profiles receive one
table, ready up, submit 30 real server shots, replay duplicate requests, observe
identical final checkpoints and each receive exactly one settled draw. Desktop
and mobile real-empty board checks pass with no horizontal overflow or console
errors; guest ranked search shows an actionable saved-profile message.

Integration checkout `/private/tmp/konk-ranked-integration` is based on the
current public site revision. The full 607-test suite and Worker dry run pass.
`scripts/verify-local-ranked-board.mjs` played five local ranked draws against
three distinct opponents, then confirmed one placed player on `/standings`.
The populated board and direct ranked lobby were inspected at desktop and phone
widths with no clipping or console errors. Local match verification also passed
against this integrated Worker.

Remaining release gates: physical two-device ranked playtest and final security
review. Production ranked remains disabled; do not enable it or rate friend
rooms yet. Activation also requires a published Monday UTC season anchor in
`RANKED_SEASON_ANCHOR`.
