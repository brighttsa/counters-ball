# Cooperative Match Transitions

## Evidence

Cloudflare's supplied screenshot shows elevated interaction latency for portrait
Play, Replay and Next. All three routed through synchronous scene construction.
At six-times CPU throttling, local baseline click handlers took 578.5 ms for
portrait Play and 429 ms for Replay. These are lab handler measurements, not
field INP or total loading duration.

## Change

Solo matches build a detached stage in cooperative tasks, yielding after paint
between construction groups. The existing match stops updating/rendering while
construction runs. A cancellable modal gives immediate feedback; cancellation
disposes partial resources and preserves the previous session. Keyboard aiming
and pause shortcuts cannot act through the modal.

The synchronous stage API remains available for existing online and attract
callers. Physics, seeded artwork, texture resolutions and gameplay rules are
unchanged.

## Verification

- Real Chrome scene geometry, transforms and canvas-texture hashes match the
  synchronous builder in all six venues, after fonts finish loading.
- Latest six-times CPU run: portrait Play 106.3 ms, Replay 20.7 ms, Next 13.5 ms.
- Cancellation preserves the original session; no browser errors.
- Mobile and desktop screenshots inspected; no horizontal overflow.
- Two-client validated Veranda check passes, including lost-ack reload and
  canonical opponent-state parity.
- Automated tests use the real Three.js fixture via COUNTERS_TEST_THREE.

This is local work, not deployed. It does not resolve homepage/trailer LCP,
initial boot construction, first-frame shader compilation, or sustained gameplay
frame rate. Field improvement requires deployment and fresh analytics data.
Native-device performance has not been measured.

## Production Integration

The release is integrated independently onto 0d6b1a3, retaining its existing
hashString seed function instead of importing unpublished multiplayer code.
All 400 production-branch tests pass. Pixel-hash verification uses a consistent
CPU canvas raster backend: Chrome's default backend showed sparse antialiasing
differences (one sample: 26 channels out of 262144, maximum delta 4). Runtime
canvas settings remain unchanged, and timing checks restore the original API.
