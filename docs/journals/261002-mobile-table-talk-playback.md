# Mobile Table Talk Playback

Date: 2026-10-02
Owner: Codex
Status: Verified and independently reviewed browser patch; approved publication pending.

The user reported no mobile voice after allowing microphone permission. An
SDK-shaped regression reproduced a separate, concrete defect: after join-time
speaker unlock failed, a mic tap started capture without retrying speaker
unlock. Pre-fix `src/core/livekit-browser-voice-adapter.js:42` delegated capture
alone; `:39` also awaited SDK recovery before starting media elements. This
confirms a code defect, not the cause of the user's phone failure. LiveKit's
[official SDK reference](https://docs.livekit.io/reference/client-sdk-js/index.html)
requires `startAudio()` in a click/tap handler, explaining exposure on
gesture-restricted mobile browsers.

The browser fix starts capture and speaker unlock in the same tap stack and
combines room and track playback status. Review found two P2 recovery regressions.
With owner approval, overlapping unlock requests now share one pending SDK call
and follow its change-only playback status; event filtering was rejected because
it diverged from the SDK's shared state. Blocked updates preserve session.error
microphone-denial help. Both new regressions failed before and pass after correction.
Scope remains private friend and knockout Table Talk; native
implementation and provider behavior are unchanged.

Verification: ten new tests (six adapter, four controller); corrected full suite
486 passing, zero failures; 226 source JavaScript files parse; whitespace clean;
browser preview boots without console errors. Exact standalone reproduction passes.
Public signatures and provider/native behavior remain unchanged.
No physical-phone verification or actual human audio established yet.

Publishing and review corrections were approved. Final review found no concrete
blockers; deployment is pending. Full diagnosis and test coverage:
[mobile playback report](../table-talk-mobile-playback-fix.md).
# Follow-up: soundtrack audio mode blocked microphone capture

The user's next screenshot exposed the capture path. Game startup forced the
iPhone audio session into playback-only mode, which WebKit rejects for microphone
capture. The earlier playback tests did not model this browser-wide audio mode.
A new regression runs the actual bundled SDK against WebKit's documented media
boundary; it reproduced the generic failure and passes with coordinated
play-and-record ownership. Stop/cancel/error restores game playback, and
publication errors now give connection advice. All 496 tests pass. Physical
two-phone speech remains unverified; independent review hit a usage limit.
