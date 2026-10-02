---
title: Compact expandable Table Talk control
date: 2026-10-02
status: approved-design
owner: codex
---

# Compact Expandable Table Talk Control

## Summary

After Table Talk connects successfully, replace the full control panel with a compact, labeled voice pill. Keep the microphone off by default and show its state in the collapsed pill. Tapping the pill expands the existing controls. The compact behavior applies both in the room card and in the match HUD.

The user approved automatic collapse on connection with the microphone still off, plus expansion by an explicit action. This document specifies design only; implementation awaits planning.

## Requirements

- Collapse after a healthy voice connection (`listening`, mic off), not after permission alone.
- Keep mic state explicit in both collapsed and expanded presentations (`Mic off` / `Mic on`).
- Tapping the compact control expands the current panel. A visible collapse action returns it to compact mode.
- After the initial automatic collapse, respect the player's expanded/collapsed choice; do not auto-collapse again on subsequent voice state updates.
- Preserve existing actions: enable/mute microphone, leave voice, and enable room audio when autoplay recovery is needed.
- Keep the panel expanded while connecting, requesting microphone permission, or presenting a recoverable playback/permission error.
- Preserve existing responsive placements: inline in the room card before kickoff; HUD-safe fixed placement during active play.
- No voice transport, server, permission, or audio behavior changes.

## Interaction

| State | Presentation | Behavior |
| --- | --- | --- |
| Idle / connecting | Existing expanded panel | Join action and progress/status remain visible. |
| Healthy connection, mic off | Compact 44px-minimum-height pill: `Voice · Mic off` plus expand chevron | Automatically collapses once after successful connection. The entire pill is a labeled button. |
| Connected, mic on | Compact pill reports `Voice · Mic on` with a non-color-only live indicator | State remains apparent without opening the panel. |
| Expanded while connected | Existing full panel and voice actions | Manual expansion persists until manually collapsed or the session ends. |
| Playback blocked / permission recovery | Expanded panel with existing recovery action and explanatory text | Never hide the action needed to recover. |
| Voice left / room reset | Hidden or idle according to existing flow | Reset expansion state for the next voice session. |

The compact toggle exposes `aria-expanded` and `aria-controls`; its accessible name includes connection and mic state. When automatic collapse hides the focused Join action, move focus to the compact toggle. Keep the interactive target at least 44px high, retain visible keyboard focus, and honor reduced-motion preferences.

## Alternatives Considered

| Approach | Benefit | Cost / risk | Decision |
| --- | --- | --- | --- |
| Labeled compact pill inside the existing panel | Clear status; keeps current room/HUD placement; touch-friendly | Uses more space than a bare icon | Recommended and approved |
| Floating popover anchored to a small HUD button | Very compact while closed | Risks covering HUD or room content; introduces a second placement model | Rejected |
| Icon-only collapsed button | Smallest footprint | Poor discoverability; mic state is hidden; weaker accessibility | Rejected |

## Touchpoints

- `play/index.html`: semantic expanded/collapsed trigger and controlled panel region.
- `src/ui/table-talk-controls.js`: connection-state transition, manual toggle behavior, focus handoff, reset and recovery exceptions.
- `styles/table-talk.css`: compact/expanded states, transition, focus, responsive sizing, reduced motion.
- `tests/table-talk-onboarding.test.mjs`: auto-collapse, user toggle persistence, state labels, recovery visibility, focus target and 44px target.
- `src/ui/live-match-room-flow.js`: existing room/HUD relocation must preserve the selected expansion state; do not change voice lifecycle semantics.

## Success Criteria

1. A successful Join voice lands in the compact state while microphone capture remains off.
2. The collapsed control clearly distinguishes mic off from mic on and can be expanded by touch, keyboard, and assistive technology.
3. Expanded state survives later status updates and room-to-match relocation; user can collapse it again.
4. Playback and microphone recovery actions are never hidden while required.
5. Room-card Back and copy remain unobstructed; the compact panel remains within the existing match HUD safe placement.
6. Focus remains visible and predictable through automatic collapse; the control honors reduced motion.

## Scope and Risks

In scope: Table Talk control presentation and focused tests. Out of scope: voice server/transport, permission acquisition, microphone defaults, matching, and audio mixing.

Main risk: status updates can arrive asynchronously during expansion. Model expansion as user intent plus a one-time post-connect collapse so later state updates cannot unexpectedly close the panel. A manual real-device pass should include iPhone Safari, keyboard navigation, mic-off/on, autoplay recovery, and room-to-match transition.

## Next Step

TDD implementation plan created at [`plans/261002-table-talk-compact-control/plan.md`](../261002-table-talk-compact-control/plan.md). No code changes have been made.
