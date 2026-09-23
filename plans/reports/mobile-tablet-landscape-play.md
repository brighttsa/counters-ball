# Landscape-First Mobile and Tablet Play

## Player Goal
See both goals, plan a flick and reach match controls without competing overlays.
Owner chose landscape-first with portrait still available. This is a layout and
entry-flow correction, not a claim that physical-phone feel is fully solved.

## Rules and State
- Portrait match entry up to 1024px wide offers rotation before creating the match.
- Rotate to landscape or choose Play in portrait to proceed once. Subsequent
  entries in the same page session do not repeat the accepted prompt.
- Back/Escape drops the pending entry; later rotation cannot launch it.
- No forced orientation lock, fullscreen requirement, gameplay cost or new timer.
- Existing active-match resize cancellation is unchanged: stale release cannot fire.
- Native dialog provides modal focus handling; match creation remains in main.

## Design Filter
- Response: explicit opt-out; no match running behind the entry prompt.
- Clarity: pause and turn status no longer share a corner; landscape HUD uses
  top and bottom perimeter positions. Short camera panels scroll with a fixed heading.
- Satisfaction: existing shot audio and impact visuals unchanged.
- Fit: ink, chalk and yellow treatment matches the existing game.
- Motivation: progression, difficulty and rewards unchanged.

## Verification and Playtest
- 141 tests pass, including four orientation gate tests; source syntax checks pass.
- Port 4181: portrait prompt, Back, portrait opt-out and rotation-to-start exercised.
- Schoolyard Street Legends: HUD bounding checks find no overlap/clipping at
  320/375/390/430 x 844, 568x320, 844x390, 768x1024 and 1024x768.
- Nonblank GPU samples across those sizes; phone and tablet captures inspected.
- Prepared tablet drag, rotation, stale release: aiming state, zero flicks used,
  stationary bodies. Classic hot-seat at 568x320: a real input release launches
  a shot and consumes one flick; play reaches the other side's turn.
- Existing unattributed MutationObserver console diagnostic persists.
- Screenshots in the task visualization directory: `landscape-phone-844.png`,
  `phone-portrait-320.png`, `tablet-portrait-768.png`, `tablet-landscape-1024.png`,
  `phone-landscape-camera-568.png`. Early tablet captures precede compact turn strip.

## Remaining Human Checks
New player: choose orientation and find pause without explanation.
Stress: rotate while dragging, with camera selector open and during replay.
Skill: deliberately repeat a bank shot in both orientations.
Abuse: repeated Back/rotate/start must not skip a venue or spend a flick.
Readability: identify the active lane and next obstacle position on real phones.
Physical Safari/Android touch, notches, browser chrome and sustained frame rate
remain unverified. No physics/camera tuning values changed in this pass.
