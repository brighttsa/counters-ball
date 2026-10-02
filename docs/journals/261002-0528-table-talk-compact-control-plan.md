---
title: Compact expandable Table Talk control plan
date: 2026-10-02
---

# Compact Expandable Table Talk Control Plan

## Context

The full Table Talk panel occupies room-card and match-HUD space after players connect. The owner approved an automatic compact state after successful voice connection, while keeping microphone capture off.

## What Happened

Recorded the interaction design and created a three-phase TDD implementation plan: prove the state/focus contract with failing tests, implement the semantic compact pill and persistent expansion intent, then verify responsive/accessibility behavior.

## Decisions

- Compact state remains labeled with explicit microphone state; it is not icon-only.
- Playback and microphone recovery remain expanded.
- Voice transport, permissions, and server behavior are out of scope.
- No source code changed; implementation awaits the user's next-step choice.

## Next

Review `plans/261002-table-talk-compact-control/plan.md`. A small, scoped plan can proceed directly to implementation, or receive a validation pass first.
