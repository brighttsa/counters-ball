# Public Rival Capacity

The matcher has no fixed total-player admission ceiling. Rival matches remain
two-player games, and each match runs in its own Durable Object.

The shared pairing coordinator uses SQLite records and indexes for ticket
lookup, oldest eligible rival selection, expiry and per-client abuse limits.
It no longer rewrites a global JSON map on each search or rejects new clients
after 1000 client records. The former 100 waiting-search and 1000 retained-ticket
checks are removed. Keeping one pairing pool avoids isolating scarce opponents
across shards during KONK!'s early growth.

Existing tickets, assigned results, cancellation tombstones and abuse counters
are migrated from the old maps on first use under the existing concurrency lock.
The queue object identity and public API do not change. Searches expire after
20 seconds without renewal; results and cancellation records last two minutes.
Cleanup removes expired records without deleting live searches or repeatedly
postponing its alarm under sustained traffic.

Per-client protections remain: 20 new searches and 240 requests per minute.
The client identifier is a short-lived digest of the Cloudflare-supplied IP,
so these protections are shared by players on the same public IP.

Verification: 1200 synthetic clients produce 600 distinct matches with two
distinct seats each in both SQLite tests and Cloudflare's local runtime.
150 waiting searches survive room-installation failure and pair after recovery.
Migration, cancellation, expiry, retries and existing matchmaking regressions pass.
All 500 game tests pass. These checks establish correctness beyond the old caps;
they do not establish an unlimited production throughput guarantee.

The coordinator, Cloudflare plan and infrastructure still have finite resources.
Multiple pairing coordinators require an explicit cross-queue handoff protocol
before deployment, so sparse queues do not strand players or assign them twice.
That distribution is not implemented in this release.
