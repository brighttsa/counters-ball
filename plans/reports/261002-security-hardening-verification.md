# Security Hardening Verification

Date: 2026-10-02. Base: deployed main e87a1c7.

## Changes

- Wrangler updated to 4.146.0; refreshed lockfile removes known development
  dependency advisories without changing the production renderer dependency.
- Guest POST /rooms and POST /matches share a concurrency-locked Durable Object
  budget: 12 attempts per network address per minute, 300 total per minute.
  Failed attempts count too. Only short-lived address hashes are stored.
  Rejections return HTTP 429 with Retry-After: 60. Existing joins, room reads,
  turns and seat authentication are unchanged. Limits do not require accounts.
- Room, message-turn, subscription, profile and matchmaking request bodies are
  bounded while streaming. Limits count UTF-8 bytes, not JavaScript characters.
  Oversized chunks cancel reading; Content-Length is only an early rejection
  hint, never the authority. Limits apply to internal profile reads as well.
- Secret files, node_modules and Wrangler caches are ignored. Example secret
  configuration files remain eligible for version control.

## Verification

- 406/406 tests pass with COUNTERS_TEST_THREE configured to Three.js r160.
- Six new tests cover exact byte limits, split UTF-8, false Content-Length,
  cancellation, per-client/global creation budgets, expiry, hashed identities
  and profile/search oversized-body rejection before storage access.
- Local Wrangler HTTP checks: guest create/join/read succeeded; oversized room
  and chunked profile bodies returned 413; exhausting the room budget also
  blocked message-match creation with 429 and Retry-After.
- Worker dry-run bundle succeeds; 211 runtime JavaScript syntax checks pass.
- npm audit --package-lock-only reports zero known advisories, including dev.
- git diff --check passes.

## Boundaries

Not deployed. Root dirty runtime work remains untouched. Account-plan safeguards
are separate and still await approval. No account authentication changes here.
The budgets reduce successful allocation abuse, not all request billing or
distributed denial-of-service traffic; platform-level controls remain useful.
Shared networks have a shared allowance; tune limits based on real traffic.
No permanent IP identifiers, forced guest login or live stress testing added.
