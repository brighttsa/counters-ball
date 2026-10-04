# KONK! Community Leaderboard Specification

Status: design and implementation specification; ranked play is not yet shipped.
Scope: existing web/iOS gameplay, guest access, Rival matching and four-player cups.

## Confirmed Inputs

- Score: verified match results weighted by opponent strength; cup podiums separate.
- Pool: plan for 50-200 weekly competitors initially, with no fixed admission cap.
- Cadence: weekly cups and four-week ranked seasons.
- Sessions: short, turn-based matches across web and iOS.
- Rewards: cosmetic badges and titles; no currency, money or gameplay advantage.
- Audience: casual-first, ranked optional; guests retain casual multiplayer access.
- Complexity: room podiums, friends board and one seasonal ranked board at launch.
- Matching: gradually widening skill ranges; private rooms unrestricted.
- Assumptions: no proven active-player count, no paid power advantage, UTC boundaries.

## Existing Implementation And Gaps

`match-server/src/tournament-room-rules.js` already builds two semifinals and a
final, producing first, second and joint third places. Reuse it for cup displays.
`src/ui/tournament-room-bracket.js` already renders the bracket and standings.
`match-server/src/konker-profile-service.js` authenticates profiles using a
hashed recovery secret; names are mutable, profile IDs stable. These are
recoverable identities, not email/social-login accounts. Match seats currently
use separate room tokens without binding them to authenticated profile IDs.

`live-duel-room-turns.js` and `tournament-room-turns.js` accept client-produced
turn letters. `match-turn-ledger-rules.js` checks identity, turn order, sequence
and continuity, but does not independently simulate a shot or validate its final
score against physics. Current results must not become trusted ranked results.

The indexed Rival matcher has no fixed admission cap, but uses a shared pairing
coordinator; production throughput is finite and multi-coordinator handoff is
not implemented. Its current matches are casual and matched FIFO, not by skill.
There is no persistent community rating, season settlement or friends graph.

## Group Structure And Ladder

Start with one seasonal ranked pool, not arbitrary 50-player groups. At 50-200
participants, dividing the pool would make opponents harder to find. Paginate
board reads in pages of 25; pagination is not an admission limit. Show top 10,
the player's rank and two neighbors on either side. Friends is a filter of the
same ratings, not another scoring system. Knockout remains four seats per room.

Use one competitive tier at launch. Do not introduce a promotion/demotion
pyramid before participation supports it. Optional cosmetic rating milestones
can provide long-term goals, but they must not split matchmaking pools.
Reconsider leagues after four seasons with at least 500 eligible weekly players
and acceptable search times. The absence of promotion/demotion is intentional:
medium-term goals come from placement and seasonal achievement, not league churn.

## Score, Eligibility And Matching

Start each new profile at 1000 internal rating. Elo expected result is
`E = 1 / (1 + 10 ** ((opponentRating - rating) / 400))`.
For a verified result use `delta = 24 * (S - E)`, with S = 1 win, .5 draw, 0 loss.
Apply opposite deltas atomically, storing fractional ratings and rounding only
for display. Goals and winning margin do not add rating. No participation bonus.

Five completed rated matches against at least three distinct profiles qualify
a player for a visible rank. Before then show "Placement 2/5", not a fake rank.
Keep provisional ratings usable for matching. Self-matches, guests, practice,
AI, hot-seat and ordinary private rooms never count. Only the first two completed
matches against the same opponent per UTC day count; subsequent encounters are
explicitly marked unranked before ready-up. Do not retroactively void a match
because a counter advanced while it was running; eligibility is reserved at start.

Rank by exact rating. Exact ties share a competition rank; public profile ID
orders tied rows only for stable pagination. Do not reward time played as a tie-break.
Matchmaking starts within +/-150 rating, widens by 100 every 15 seconds up to
+/-500, and offers "Keep searching" or "Play casual" after 90 seconds. Never
silently switch a ranked search to casual. Guests can find casual rivals without
signing up. Search ranges and timeouts require telemetry tuning, not a player cap.

## Cadence, Resets And Rewards

Anchor seasons at a published Monday 00:00 UTC, lasting exactly 28 days.
Each weekly cup window lasts seven days. Register match competition/season IDs
at ready-up; a match started before cutoff has ten minutes to finish and remains
in its original season. After that deadline, continue casually without ranking.
Settlement waits for this grace period, freezes eligible receipts, awards badges,
archives the board and opens the next board. New-season play can begin immediately;
old and new season records remain separate during settlement.

Soft-reset ranked rating to `1000 + .5 * (previousRating - 1000)` each season.
Five placement matches are required each season; lifetime history and badges
remain. Do not describe this as everyone returning to zero. Weekly cups reset
event standings, never the underlying season rating. No inactivity demotion.

| Competition | Position | Reward |
| --- | --- | --- |
| Four-player weekly cup pod | 1 | Dated Cup Champion badge |
| Four-player weekly cup pod | 2 | Dated Cup Finalist badge |
| Four-player weekly cup pod | Joint 3 | Completed-cup result in history |
| Seasonal ranked pool | 1 | Dated Season Champion title |
| Seasonal ranked pool | Top 10% | Dated Top KONKER badge |
| Seasonal ranked pool | Every eligible player | Personal season summary |

Cup winners are champions of their named four-player pod, not falsely declared
the sole global weekly winner. No cumulative tournament-play-volume ranking.
Official cups accept each profile in one pod per week; informal knockout rooms
remain unrestricted. Cup results do not change ranked rating in the first release.
For n eligible seasonal players, top-badge count is at least ceil(.1*n), including
champion; exact ties at the cutoff all receive the badge.
For p completed cup pods, award p champion and p finalist badges. At 200 players
and 50 completed pods/week this means 100 cup badges/week, 5200/year if sustained;
13 four-week seasons give at least 260 top badges/year. These are dated achievements,
not tradable resources. No currency output or power inflation.

## Identity, Fair Play And Result Authority

At ranked registration, verify profile credentials server-side and issue a
short-lived, signed seat claim bound to profile, room, seat and match nonce.
Never accept a client-supplied profile ID as proof of identity or expose recovery
secrets to other players. Identity is immutable after ready-up; validate one
active ranked seat per profile. Guest conversion cannot backfill casual ratings.

Extract deterministic simulation shared by browser and Worker. Ranked clients
send shot intents (selected cap, direction, power, earned move); the room server
validates legal turn and power, simulates the result and owns score/end state.
Pin physics/rules version and seed per match; reject incompatible clients before
ready-up. Replays are visualizations of accepted results, not scoring authority.

Only an internal finalized room receipt may update standings. Receipt ID is
room ID + bracket/match ID + version; enforce uniqueness. Include authenticated
profiles, outcome, rules version, eligibility reservation and season ID. Persist
a durable result outbox before acknowledging completion, then retry delivery.
A standings coordinator commits both rating deltas and receipt consumption in
one SQLite transaction. Retries, restarts and lost acknowledgements must not
double-award. Private room outcomes stay local until explicitly eligible.

Before first accepted shot, a disconnect is an unrated cancellation. After play
starts, allow 60 seconds to reconnect, then verify the opponent is present before
recording a forfeit. Both absent means abandoned/unrated. Infrastructure failures
void rating changes. Show reconnect countdown and forfeit rules before ranked play.

## Storage, API And UX

Proposed indexed tables: seasons, participants, ratings, result_receipts,
match_reservations, cup_entries, achievements and accepted_friend_edges.
Keep result/season state separate from mutable display names. Use authenticated
reads for personal histories; public board rows contain opt-in alias, rank,
rating and cosmetic achievement only. Never return tokens, email or recovery data.

Proposed routes: GET /standings?season=&cursor=, GET /players/me/standing,
POST /ranked/search, POST /friends/invites, POST /friends/invites/:id/accept,
GET /cups/current and POST /cups/current/entry. Profiles authenticate personal
routes; internal receipt ingestion is not a public client scoring endpoint.
Friend invitations are opaque, expiring and require acceptance; no name scraping.

In Play Live, present Casual and Ranked with Casual selected by default.
Guests choosing Ranked see "Save a KONKER profile" and can return to casual.
Board views: Season, Friends, My Cups. Provide loading, empty, offline, provisional,
settling and archived states. Display rating change only after server confirmation.
Use KONK!'s existing condensed type, paper/ink surfaces and yellow emphasis.
Voice remains optional; no microphone permission is needed for ranked entry.

## Goals, Risks And Validation

Immediate goal: overtake a visible neighbor. Short-term: finish placement or reach
top 10%. Medium-term: improve seasonal best or win a cup. Long-term: earn a dated
champion title. Defensive goal: retain position through fair play, without forced
daily participation. Do not use streak-loss pressure or punitive notifications.

Main risks: forged shot outcomes (server simulation); duplicate rewards (unique
receipts and transactions); farming/alternate profiles (repeat-opponent limits,
placement and anomaly review); sparse population (shared pool and wider search);
recovery-secret loss (existing recovery UX); season races (pinned IDs and settlement);
shared-IP rate pressure (measure and distinguish legitimate groups from abuse).
Same-opponent limits reduce farming but do not prove one account per human.

Instrument search median/p95, unmatched searches, distinct opponents, placement
completion, result retries/rejections, disconnect outcomes and cup completion.
Validate that players understand casual vs ranked, shared ties and dated rewards.

## Implementation Order And Release Gates

### Seat Identity Foundation (Implemented Locally)

Ready Up now optionally carries the saved KONKER profile credential separately
from its seat token. The Worker verifies it against the profile object, strips
client-supplied internal identity fields, and atomically binds the verified ID
before changing readiness. One profile cannot occupy two seats in a room or
replace an existing seat identity. New bindings stop after readiness/kickoff.
Guest seats remain supported. Profile IDs and credentials are not broadcast.
This is not ranked eligibility, human uniqueness, or score verification; those
remain release gates below. Web and Worker changes need coordinated deployment.

1. Authenticate immutable profile-to-seat bindings and rated eligibility reservations.
2. Implement server-owned simulation; reject fabricated scores and illegal shots.
3. Add idempotent result outbox/ledger and atomic Elo updates; test recovery/restarts.
4. Ship opt-in ranked matching, provisional placement and paginated seasonal board.
5. Add accepted friends, weekly cup enrollment, settlement and dated achievements.

Release requires forged-result, duplicate-receipt, identity-swap, disconnect,
concurrent-match, cutoff and crash-recovery tests; full two-client match checks;
mobile/desktop board inspection; and Worker load tests with realistic polling.
Capacity simulations alone do not certify production throughput. No ranked title
or reward is awarded from the current client-authored turn ledger.
