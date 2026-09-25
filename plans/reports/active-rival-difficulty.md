# Active Rival Difficulty Pass

## Problem
Players reported that KONK! was not challenging enough, especially when a table
felt like solo target practice. Navigation also did not always make the next
step obvious after Home, act select or full time.

## Direction
Street Legends should feel like a street-corner rivalry: tiny table, visible
venue trick, active opponent pressure. Kwame's Corner stays the safe solo
practice lane.

## Changes
- Every Street Legends act now hands play to a live AI rival.
- Each venue opener uses a rookie rival with a reduced away formation, so Act 1
  teaches the table while still answering the player's flick.
- The AI planner now considers a useful support position behind the ball and
  rewards reachable next touches, reducing wasted low-pressure turns.
- Home's main button is progression-led: `Start Street Legends` on a fresh save,
  then `Continue Street Legends`.
- Results use outcome-specific next actions: win can lead to `Next act`, loss
  says `Run it back`, draw says `Settle it`.
- Design docs now describe the current active-rival pattern instead of the old
  solo Act 1 model.

## Validation
- `for f in $(find src -name '*.js'); do node --check "$f"; done`
- `COUNTERS_TEST_THREE=/tmp/counters-ball-test-three-r160.mjs node --test tests/*.test.mjs`
- Local server on port 4181 served the updated app files.

## Remaining Human Test
Watch new players play Schoolyard Act 1, one mid-track Act 1 and one Act 2.
Record whether they understand the rival is using the same table rule, whether
losses create rematch intent, and whether Home/Results clearly tell them what
to do next.
