---
phase: 2
title: Implement compact state
status: completed
effort: ''
---

# Phase 2: Implement compact state

## Overview

Implement the approved compact voice pill inside the existing Table Talk aside. Keep voice transport and permission logic unchanged; model UI expansion separately from voice session state.

## Implementation Steps

1. Add one semantic labeled toggle and a controlled region for the existing status/actions in `play/index.html`; make the toggle at least 44px high and connect it with `aria-controls`.
2. In `src/ui/table-talk-controls.js`, track user expansion intent and a one-time post-connect auto-collapse latch. Collapse only on a healthy connected callback when no playback/permission recovery is active.
3. Keep the compact label synchronized to connection and microphone state, including mic-off by default. Do not re-collapse after the player manually expands.
4. On automatic collapse, focus the compact toggle before hiding the currently focused Join action; expose `aria-expanded` and an accurate accessible name.
5. Keep recovery actions expanded; reset the UI state when the voice session is cleared or a new room is configured.
6. Style the compact/expanded states in `styles/table-talk.css` with KONK ink/yellow tokens, visible focus, stable sizing, and a restrained opacity/transform transition; disable spatial motion under `prefers-reduced-motion`.
7. Preserve current `setInMatch()` behavior so room/HUD relocation does not reset manual expansion intent.
8. Run phase 1 tests, focused Table Talk tests, and source syntax checks; refine only failures introduced by this feature.

## Success Criteria

- [x] All phase 1 tests pass without changing network, server, or mic-capture behavior.
- [x] Compact pill states clearly read `Voice · Mic off` or `Voice · Mic on`; the expand/collapse action remains discoverable.
- [x] The full existing action set is reachable when expanded; voice recovery cannot be hidden.
- [x] Button target is at least 44px, keyboard focus is visible, and reduced-motion removes spatial transition.

## Risk Assessment

Asynchronous audio and native voice callbacks can arrive in different orders. Base auto-collapse on the controller's healthy state, check the recovery flags, and use a one-time latch so late status events cannot override the user's choice.
