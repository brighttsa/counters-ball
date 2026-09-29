# KONK Native

An offline iOS, iPadOS and macOS host for the current KONK experience. Each
build packages the same game source, pinned Three.js r160 modules, fonts and
audio into the application and serves them through an internal WebKit origin.
There is one gameplay source of truth rather than a separate native remake.

## Run

1. Open `KONKNative.xcodeproj` in Xcode.
2. Select an iPhone or iPad running iOS 17 or later, or My Mac (Mac Catalyst).
3. Set the signing team for the `KONKNative` target.
4. Build and run.

The bundle identifier is `world.konk.native`. Change it in Signing &
Capabilities if that identifier is unavailable on the selected team.

## Current scope

- Exact current KONK home, modes, venues, matches, audio and local saves.
- Offline boot and play for all solo, AI, Daily Flick and hot-seat modes.
- Local Three.js, fonts, images and soundtrack; no boot-time network request.
- Full-screen iPhone and iPad presentation with inline media playback.
- A Mac Catalyst build from the same target and packaged runtime.
- Inspectable WebKit content for Safari/Xcode debugging.

Live Match, Message Match, sharing and incoming web challenge links still use
online services by design. Losing connectivity does not interrupt local play.

The older native Schoolyard experiment remains outside the launch path while
its reusable physics and rendering work is evaluated against the web game.
It is not the product specification.
