# Table Talk SDK Feasibility

2026-10-02. Isolated branch codex/table-talk, based on deployed c7bec27.
Production Worker pilot deployed as 27c1d9ff-5da4-433c-9774-db2ddc813cec.
Web client published from main commit f73abd0; konk.world/play and the LiveKit
browser asset both return HTTP 200. Physical-device/live-room verification
remains outstanding.

## Implemented

- Browser SDK 2.22.3, local server SDK 2.19.1, exact npm lockfile.
- Swift SDK 2.17.0, exact Xcode package requirement and Package.resolved.
- Swift transitive pins: LiveKitWebRTC 150.7871.2 and LiveKitUniFFI 0.1.9.
- Isolated lifecycle controller: join muted, explicit capture, mute stops track,
  generation checks, stale capture/publish cleanup, leave disconnects.
- Browser adapter attaches only audio subscriptions; no camera capture.
- Native service compiles, observes background and interruption, starts capture
  only after explicit unmute permission, and reports remote active speakers to
  the soundtrack mix. The game owns its native bridge lifecycle.
- Microphone usage description added; no background audio entitlement added.
- Loopback-only test server with strict routes/Host/Origin, no credential logs,
  microphone-only grants, two total admissions and a ten-minute probe lifetime.

Test server reads the owner's ignored root match-server/.dev.vars directly; no
credentials copied to this checkout or a client resource. Temporary provider
room deletion confirmed after the test, and the test server stopped.

## Verification

- Actual browser SDK connected to LiveKit Cloud: Connected / Microphone off.
- Browser Leave returned to Disconnected. No mic permission requested.
- Unsigned generic iOS Debug build succeeded with native voice service compiled.
- Nine lifecycle regressions pass; all 415 repository tests pass when
  COUNTERS_TEST_THREE points to the packaged Three.js r160 module.
- 199 JavaScript syntax checks and project-file lint pass; diff whitespace clean.
- npm reports zero advisories in the isolated SDK tool dependencies.

Browser bundle on disk is approximately 584 KiB uncompressed. Debug app embedded
Frameworks are approximately 13 MiB; this is not a release-size delta or IPA size.
LiveKit client/server/Swift SDKs use Apache-2.0. WebRTC and native transitive
license notices remain in resolved official dependencies; verify redistribution
notices and release size before packaging the shipping SDK bundle.

## Remaining Before Completing Phase 1

Room controls now join muted, require explicit microphone unmute, mute/leave and
renew a short lease. They appear only in private friend and knockout rooms; public
matchmaking never joins voice. Remote speech gently ducks music while preserving
effects on web and iOS.

Production admission uses a separate serialized coordinator with a five-room
pilot cap, four-seat room cap, room/seat-generation proof, a 45-second presence
lease, 30-minute session ceiling, explicit token revocation and quarantined
capacity retention if provider cleanup is uncertain. Case-sensitive room codes
map to distinct provider rooms. `TABLE_TALK_ENABLED` is enabled for the capped
production pilot. Live production preflight returns 204 with the exact
`https://konk.world` origin; a join without proof of an active private seat
returns 403. Production provider credentials are Worker secrets, not client
configuration.

The Worker dry-run and production deployment passed. All 428 repository tests
pass with Three r160, all JavaScript sources parse, and an unsigned generic iOS
build succeeds. Xcode lists the iPhone XR as unavailable; real-device checks of
WK origin/CORS, mic/speaker routes, background teardown, music duck/restore,
provider cleanup and gameplay frame time remain outstanding. Never expose the
separate loopback test issuer.

## Reproduce Local Probe

From this checkout run node scripts/table-talk/serve-feasibility.mjs, then open
http://127.0.0.1:4192/. Only two admissions are allowed per run. Stop with Ctrl-C
and require confirmed provider room cleanup before another run. No microphone
permission should occur until Unmute. Never put a provider token in a URL.
