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
