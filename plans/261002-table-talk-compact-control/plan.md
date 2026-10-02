---
title: "Compact expandable Table Talk control"
description: "Test-first implementation plan for Table Talk's compact connected state"
status: pending
priority: P2
branch: "codex/table-talk"
tags: []
blockedBy: []
blocks: []
created: "2026-10-02T05:30:19.807Z"
createdBy: "ck:plan"
source: skill
---

# Compact expandable Table Talk control

## Overview

Implement a one-time automatic collapse after Table Talk reaches a healthy connected state, while keeping the microphone off by default and its state visible. The labeled compact control expands the existing actions; playback/permission recovery stays expanded. Preserve the player's manual choice and the current room-card/match-HUD placements.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Test-first control contract](./phase-01-test-first-control-contract.md) | Pending |
| 2 | [Implement compact state](./phase-02-implement-compact-state.md) | Pending |
| 3 | [Verify responsive and accessible behavior](./phase-03-verify-responsive-and-accessible-behavior.md) | Pending |

## Dependencies

No blocking plan dependencies. Design: [`261002-0528-table-talk-compact-control-design.md`](../reports/261002-0528-table-talk-compact-control-design.md).

## Constraints

- Static HTML/CSS and ES modules; no new dependency or binary asset.
- Do not change LiveKit/native voice adapters, server tokens, microphone permission behavior, or matchmaking.
- Keep compact interactive target at least 44px high, expose `aria-expanded`/`aria-controls`, preserve focus when Join becomes hidden, and honor reduced motion.
- Treat playback blocked, microphone permission request/denial, and connection failures as expanded/recovery states.

## Success Criteria

- First healthy voice connection collapses once to a labeled `Voice · Mic off` control; mic capture remains off.
- The pill expands/collapses by mouse, touch, and keyboard and announces current mic/connection state.
- Later state updates and lobby-to-match relocation do not override manual expansion choice.
- Recovery actions remain visible when needed; room Back and gameplay HUD content stay unobstructed.
- Focused and full test suites, source syntax, diff checks, and responsive browser/device review pass.
