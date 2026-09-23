# Mobile camera framing and control pass

## Player goal
See the caps, ball, goals and venue obstacles at a useful size, then switch
views without firing a shot or losing the action.

## Design check
- Clarity: Tactical and Broadcast retain both goals, playable rails and HUD
  clearance. Street Level frames the nearest current-side cap, ball and goal.
- Response: camera selection cancels a held aim without consuming a flick;
  camera transitions remain interruptible. The final viewport fit is found by
  bounded search instead of fixed 4.5% distance steps.
- Satisfaction and fit: Broadcast moves closer where the view geometry allows;
  replay temporarily owns its cinematic camera and returns to the player view.
- Motivation: no progression rules changed.

## Camera states and edges
Preset entry requires an active match. Preset changes cancel an active drag;
releasing that pointer afterward submits no flick. Street Level recomputes its
pose when resting piece or goal positions change, then locks during active aim.
Replay suspends player control, and the chosen mode resumes afterward. Local
two-player still tracks preferences per side. No online mode exists.

## Starting values and tests
The steeper portrait Broadcast direction and fit bounds are starting values,
not claimed standards. Regression tests project both playable rail ends,
goal structures and elevation across 320/375/390/430 phone widths, short
landscape phones and two tablet sizes. Pass: every sampled point remains clear
of the HUD and the playable projection uses at least 80% of one available axis.
If real-device players still perceive the table as small, first reduce HUD
reservation with a compact overlay; never crop touchable caps to gain scale.

Existing tests verify the same world drag gives the same velocity in Tactical,
Broadcast, Street and Free, and cancellation prevents a shot. The browser
verification harness on 4181 showed Street and Free views changing without
moving bodies or spending flicks; a tablet drag cancelled on camera selection.
After the final margin correction, the full 191-test suite passed. The in-app
browser connection refused a fresh visual capture in this continuation, so
the final framing needs a visible phone/tablet check. Sustained FPS, touch
comfort and replay presentation also need physical-device testing.

## Street Level follow-up, 2026-09-23
Live 844px Schoolyard inspection showed that the first Street Level pose hid
the near pitch beneath the viewport. Fitting the entire table pushed the
camera too far away. The revised pose instead fits the near playable edge,
current cap, ball and far goal, with a bounded minimum distance. Fresh harness
captures at 844x390 and 390x844 show both goals and active caps; Tactical,
Broadcast and Free also respond to the selector. The near-edge projection is
now in the regression test. Full suite: 192 pass. Browser errors still include
the pre-existing refresh-time chalk font `.then` failure and an unattributed
MutationObserver diagnostic; this pass did not resolve those issues. A physical
phone/tablet touch and sustained-FPS check remains open. No deployment.

## Preset response follow-up, 2026-09-23
The live 4181 match shows Tactical, Broadcast and Street Level do select and
produce distinct angles, but their eased transitions used simulation `dt`,
which the render loop caps at 50 ms. A preview running near one frame per
second could therefore take several seconds to show the selected pose even
though the selector label changed immediately. The player-camera controller
now uses real elapsed time for its visual blend only; gameplay update timing,
physics and flick counts are untouched. A fresh 844px Schoolyard preview showed
Tactical on the first captured frame after selection. The full 193-test suite
passes, including a throttled-frame blend regression. Browser cache means an
existing match tab needs a refresh to load this change. Physical-device
response remains unverified; no deployment.
