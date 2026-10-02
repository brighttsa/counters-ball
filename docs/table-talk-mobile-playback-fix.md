# Mobile Table Talk Playback Fix

Date: 2026-10-02
Status: Verified and independently reviewed browser patch; approved deployment pending.

The patch addresses reproducible browser playback defects. It does not establish
the cause of the user's specific phone failure without a two-phone test.
Source references below distinguish pre-fix HEAD from the correction.

## Diagnosis

1. **Reported symptom:** On mobile, Table Talk had no voice after microphone
   permission was allowed. No physical-phone reproduction or actual human audio
   has been established yet.
2. **Deterministic reproduction:** In the SDK-shaped adapter test, connect with
   `startAudio()` rejecting outside a gesture (`gesture required`), then enable
   the gesture flag and call `capture()` with permission still pending; the old
   adapter starts capture but never retries speaker unlock, so speaker playback
   remains blocked after the mic tap (`tests/livekit-browser-voice-adapter.test.mjs:40`).
3. **Expected versus actual:** The mic tap should start capture and speaker
   unlock in the same synchronous call stack; previously capture could succeed
   while output stayed blocked, and explicit audio recovery awaited the SDK
   before starting media elements, leaving those calls outside the tap stack.
4. **Root cause and evidence:** In pre-fix HEAD,
   `src/core/livekit-browser-voice-adapter.js:36` started audio after awaiting
   connection, `:42` delegated capture without speaker recovery, and `:39`
   awaited the SDK before element playback. Element-only status at `:17`/`:29`
   could erase a room-level block; SDK playback-status events were unobserved.
   Correction sites are `src/core/livekit-browser-voice-adapter.js:27`
   (parallel initiation), `:69` (capture plus unlock), `:11` and `:44` (combined
   room/track status). These source defects are confirmed independently of the
   unconfirmed cause on the user's device.
5. **Why now:** Gesture-restricted mobile playback exposes the separation
   between microphone permission and speaker permission when asynchronous join
   cannot unlock output; permissive playback environments can conceal this
   defect. LiveKit requires `startAudio()` in a click/tap handler and documents
   restrictive iOS Safari behavior, playback events, and `canPlaybackAudio`.
   This explains the reproduction condition, not a proven new device or SDK
   regression. See the [official LiveKit JS SDK reference](https://docs.livekit.io/reference/client-sdk-js/index.html).
6. **Blast radius:** Browser Table Talk in private friend matches and four-player
   knockout rooms shares this adapter, including lobby and match controls
   (`src/ui/live-match-room-flow.js:67` and `:146`). Public pairing excludes
   Table Talk. Native voice uses its separate adapter
   (`src/ui/table-talk-controls.js:83`); native implementation and provider/token/
   coordinator behavior are unchanged by this browser fix.

## Fix and Review Corrections

Capture and speaker unlock now begin in the same tap stack without waiting for
permission. Explicit recovery starts the SDK and every attached element before
awaiting either. Combined room and track status retains recovery until both are
playable and reacts to later SDK suspension, including before any remote track
exists. Element result identity and the closed flag fence promise completions.
Overlapping unlock requests share one pending SDK call rather than allowing
competing calls to overwrite its global playback state. SDK status remains
authoritative, including its change-only events. Both playback
failure and recovery preserve denied-microphone help and retry state
(`src/ui/table-talk-controls.js:99`). Module cache versions were refreshed in
the adapter/controls import chain; joining and speaker-only recovery keep the mic off.

Final review identified two P2 recovery regressions; both were corrected with owner approval:

- **Stale SDK event overrides newer success:** An older pending `startAudio()`
  emits `AudioPlaybackStatusChanged` before rejecting. Its event can override a
  newer successful recovery. The initially proposed event filtering was rejected
  because it left the SDK's state divergent. Owner-approved coalescing now prevents
  competing SDK calls instead. A change-only SDK-state regression failed before
  correction and passes after.
- **Blocked event loses microphone-denial help:** The blocked branch at
  blocked branch previously called `update()` without `session.error`.
  It now forwards the error; a denied-mic-followed-by-speaker-failure regression
  failed before correction and passes after.

No public function signatures, server schema, grants, credentials, or native
implementation changed. Independent final review found no remaining concrete blockers.

## Recorded Verification and Limits

- Final targeted voice suite: **41 passing tests**.
- **Five new adapter regressions failed before the fix**: same-stack capture and
  speaker unlock; room blocking surviving element play/detach; SDK playback
  status changes; element play starting before the SDK settles; late rejection
  after disconnect. See `tests/livekit-browser-voice-adapter.test.mjs:40`, `:67`,
  `:82`, `:92`, and `:106`.
- **Ten total new tests added**: six adapter and four controller tests, including mic
  tap recovery without extra capture, speaker-only recovery with mic off before
  a friend speaks, and preserving denied-mic feedback/help
  (`tests/table-talk-microphone-access.test.mjs:5`, `:21`, `:40`).
- Corrected full suite: **486 passing tests**, zero failures; **226 source
  JavaScript files parse**. The first suite invocation used a nonexistent local
  Three fixture path; rerunning with vendor/three-r160/three.module.js passed.
- Exact initial standalone reproduction passes: a mic tap synchronously makes
  a second startAudio call, and the final blocked state becomes false.
- Browser preview boots with no console errors or warnings; whitespace checks pass.
- No physical-phone verification or actual human audio established yet. SDK-shaped
  tests prove the code defect and its correction, not end-to-end audibility or
  the cause of the user's specific mobile failure.
- User approved publishing and both review corrections. Deployment pending.
