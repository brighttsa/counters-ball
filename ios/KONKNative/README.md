# KONK Native

An iOS/iPadOS vertical slice of **Schoolyard Break: Ruler Rules**. The app uses
SwiftUI, SceneKit, a deterministic fixed-step 2D solver, generated audio and
procedural geometry. It does not require binary art or sound assets.

## Run

1. Open `KONKNative.xcodeproj` in Xcode.
2. Select an iPhone or iPad running iOS 17 or later.
3. Set the signing team for the `KONKNative` target.
4. Build and run.

The bundle identifier is `world.konk.native`. Change it in Signing &
Capabilities if that identifier is unavailable on the selected team.

## Slice scope

- One-goal match against Kwame with 14 flicks per side.
- Pull-and-release touch flicks and deterministic disc collisions.
- Two rulers that rotate 45 degrees with their attacking turn.
- Broadcast, tactical and street cameras.
- Automatic goal replay, haptics and generated match audio.
- Persisted Schoolyard wins and best flick count.
