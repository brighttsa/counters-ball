---
phase: 1
title: Test-first control contract
status: completed
effort: ''
---

# Phase 1: Test-first control contract

## Overview

Add failing state/DOM-contract tests before implementation so the current always-expanded behavior is captured as the regression baseline.

## Implementation Steps

1. Extend `tests/table-talk-onboarding.test.mjs` fixtures with a compact toggle, controlled action region, focus tracking, and minimal class/attribute behavior.
2. Assert a healthy `listening` connection auto-collapses exactly once and reports `Mic off`; do not request/capture microphone as a side effect.
3. Assert the toggle expands and collapses, updates `aria-expanded`, preserves manual expansion through subsequent status updates, and restores focus to the toggle when Join is hidden.
4. Assert playback-blocked, requesting-microphone, and microphone-denied/recovery states remain expanded with their recovery action visible.
5. Assert room reset returns the panel to its initial state and the existing `setInMatch` move preserves the selected expanded state.
6. Run the focused test and verify each new behavior fails for the expected missing control-state behavior.

## Success Criteria

- [x] Tests cover one-time auto-collapse, mic-off default, explicit toggle, state persistence, recovery exceptions, focus handoff, reset, and relocation.
- [x] New focused tests fail before implementation for the intended assertions; existing voice onboarding behavior remains represented.

## Risk Assessment

Test doubles can accidentally model less DOM behavior than the browser. Keep assertions on observable semantics (hidden state, attributes, focused element, and button visibility), and reserve CSS geometry/reduced-motion checks for the browser verification phase.
