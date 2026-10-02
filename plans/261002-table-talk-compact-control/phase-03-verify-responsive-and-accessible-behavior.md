---
phase: 3
title: Verify responsive and accessible behavior
status: in-progress
effort: ''
---

# Phase 3: Verify responsive and accessible behavior

## Overview

Verify that compact voice controls remain legible and non-obstructive across the room card and active-match HUD, including recovery, touch, keyboard, and reduced-motion paths.

## Implementation Steps

1. Run all focused Table Talk tests and the complete test suite with the repository's Three r160 test module.
2. Run `node --check` over every `src/**/*.js` module and `git diff --check`.
3. Preview room-card lobby and healthy connected compact state at 375×812 and desktop width; verify Back and copy/status copy remain unobscured.
4. Preview the active-match compact state at phone portrait and short landscape sizes; confirm it remains clear of scoreboard/objective and safe areas.
5. Exercise expanded/collapsed keyboard navigation and screen-reader semantics; check visible focus, truthful `aria-expanded`, and focus handoff on auto-collapse.
6. Enable reduced motion and verify no spatial transition; verify blocked audio and denied microphone leave recovery visible.
7. Record browser, viewport, and real-device checks in the handoff. Do not claim physical-device verification unless performed.

## Success Criteria

- [x] Compact and expanded fixture controls fit at the target phone and desktop sizes; short landscape remains scrollable.
- [ ] Confirm active-match HUD placement during a real connected voice session on iPhone.
- [x] User can reach microphone, leave, and playback recovery controls in at most one expansion action.
- [x] Focus/expanded state stays correct through voice updates and room-to-match relocation.
- [x] Full regression suite, syntax checks, and whitespace check pass; any unavailable physical-device check is explicitly listed as remaining.

## Verification Notes

- Local browser fixture uses the production KONK! CSS and compact-control helper. Reviewed at 375×812, 844×390, and 1440×900; mouse and Enter-key toggling behaved correctly. The fixture uses relative placement, so it does not certify the active game's fixed HUD geometry. Short landscape requires scrolling between fixture samples.
- Controller tests cover healthy connection, mic-off default, both Join entry points and focus handoff, manual choice through mic changes and relocation, audio/mic recovery, and reset.
- Focused voice tests: 33 passed. Full suite: 437 passed, 0 failed. All source JS parses; `git diff --check` is clean.
- Voice transport, server, and mic capture were not changed. No local LiveKit endpoint was available for an actual connected session; physical iPhone verification remains outstanding. Reduced-motion CSS disables transitions, but browser reduced-motion emulation was not exercised.

## Risk Assessment

The match HUD is a busy overlay and a compact pill can still intersect venue-specific objectives on short viewports. Validate real viewport geometry and adjust only within the current safe placement model; do not reintroduce a fixed full-size lobby panel.
