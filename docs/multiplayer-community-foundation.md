# KONKERS multiplayer community foundation

## Implemented locally

- Optional KONKER profile creation and name updates inside Play Live.
- A private downloadable recovery code restores the profile on another browser.
- Profile credentials travel only in Authorization headers; the server stores
  their SHA-256 hash, not the raw secret. Public room state never exposes tokens.
- Existing Durable Object namespace isolates profiles under `player:<id>`.
- Seat credentials survive browser restart in bounded local storage (10 rooms,
  30-day retention). This does not extend the server's room lifetime.
- The current invite stays in the address bar, allowing a reload to resume the
  occupied seat rather than join again. Stale credentials are discarded when
  the server rejects recovery.
- A playing duel resumes from the latest accepted turn before enabling input.
  Snapshot venue and body counts must match the actual table.
- Ready/playing seats cannot be replaced merely because presence expires.
- Sockets revalidate seat credentials after lobby replacement, including before
  broadcasts. Gameplay snapshots require an occupied seat token.
- Incoming turns replay serially, skip previously restored sequence numbers,
  and retry failed replay through HTTP even if the socket is still connected.

## Identity and recovery limits

This is a bearer-code profile, not email authentication or proof of one unique
human. Anyone possessing the code controls that profile. Keep the downloaded
file private. No recovery is possible if both local storage and the code are
lost. No rotation, verified contact method or account-deletion UI exists yet.
Browser storage depends on platform/private-mode support.

Restoring a profile restores its name, not room-seat credentials on another
device. Seats remain separate from profiles; names are not unique player IDs.
Reload restores accepted turns, not a durable outbox of unsent shots. Existing
in-memory turn retries still handle transient failures while the page is open.
Profile requests are limited to 30 per minute per hashed network identifier,
with a bounded short-lived limiter. Physical-iOS testing and ongoing abuse
monitoring remain required; network limits do not prove unique human identity.

## Approved community direction, not implemented in this milestone

Casual-first, initially 50–200 competitors. Separate private rooms, weekly cups
and optional ranked play; four-week seasons; cosmetic rewards only.

Ranked launch must wait for independent server-side simulation or validated
deterministic replays. Current room results are client-reported and cannot safely
award competitive standings. Recoverable profiles alone do not prevent farming.
Next milestone links profile identities to seats and validates match results
before introducing skill matchmaking, friends boards and seasonal ratings.

## Verification

Profile/seat/sync regression tests cover credential hashing, private transport,
origin/identity rejection, bounded seat retention, active-seat protection,
revoked sockets, authenticated snapshots, replay order and failed-replay retry.
Existing room, tournament and turn-outbox tests remain passing.

`scripts/verify-konker-profile-recovery.mjs` exercises desktop and mobile Chrome
with two isolated browser contexts: creation, private code download, profile
restore, real duel kickoff and a reload after an accepted flick. Both sessions
restore identical rules and matching physical positions with no page errors.
Screenshots inspected at 1280x800 and 390x844; no horizontal overflow.

Preview: http://localhost:4181/ with the local Worker at localhost:8787.
Play Live > KONKER profile. Web release integrates into the current /play/ page
without changing the landing page, room picker, rendering or native packaging.
Clean release checkout: all 393 tests pass with COUNTERS_TEST_THREE pointing to
a Three r160 module. Four native/UI failures remain only in the older dirty
development checkout; that unrelated work is not included in this release.
