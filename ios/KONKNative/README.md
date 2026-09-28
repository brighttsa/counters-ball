# KONK Native

An iOS/iPadOS host for the current KONK experience. The launch path renders
the live game from `konk.world` in a full-screen WebKit view so the website is
the visual, gameplay and progression source of truth while native systems are
migrated incrementally without creating a second version of the game.

## Run

1. Open `KONKNative.xcodeproj` in Xcode.
2. Select an iPhone or iPad running iOS 17 or later.
3. Set the signing team for the `KONKNative` target.
4. Build and run.

The bundle identifier is `world.konk.native`. Change it in Signing &
Capabilities if that identifier is unavailable on the selected team.

## Current scope

- Exact current KONK home, modes, venues, matches, audio and saves.
- Full-screen iPhone and iPad presentation with inline media playback.
- Native loading, retry and offline states.
- Inspectable WebKit content for Safari/Xcode debugging.

The older native Schoolyard experiment remains outside the launch path while
its reusable physics and rendering work is evaluated against the web game.
It is not the product specification.
