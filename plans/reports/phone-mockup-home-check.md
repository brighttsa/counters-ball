# Phone Mockup Home Check

Use `http://localhost:4181/tests/phone-mockup-home-check.html` to compare the KONK! Home screen inside repeatable iPhone and Samsung-style viewport shells.

The page loads the real app in iframes and marks each device PASS/FAIL for:

- Home buttons remaining inside the viewport.
- Settings/Credits staying below the main Play action.
- No horizontal page scroll.
- No vertical page scroll.
- Main Home content staying outside simulated notch / home-indicator safe zones.
- Touch targets staying reasonably large for phone use.

If the Three.js runtime cannot boot inside many simultaneous headless iframes, the harness switches that frame into a CSS fallback mode by activating the existing Home markup. Those results prove Home CSS layout across device shells, not full gameplay boot or WebGL performance.

Current representative devices:

- iPhone SE, iPhone 14, iPhone 14 Pro Max.
- Samsung S20, Samsung S23 Ultra.
- Landscape versions of the same practical size bands.

This is a local visual QA harness, not a production screen.

## 2026-09-24 Notes

The Home CSS now uses safe-area-aware padding for phone portrait and phone landscape, keeps the secondary actions in a compact three-column phone grid, and uses a dedicated two-column landscape composition instead of squeezing the portrait stack sideways.

Checked with the mockup harness on:

- iPhone SE, iPhone 14, iPhone 14 Pro Max.
- Samsung S20, Samsung S23 Ultra.
- Landscape shells for each size band.

The saved screenshot is `plans/reports/phone-mockup-home-check/phone-mockup-home-check.png`.

The harness intentionally uses conservative simulated safe zones; its small red status text can flag the whole Home stack against the mock notch rectangle even when the visible composition is clear. Use the screenshot for the visual read and the script checks for regressions in scroll, touch target size and gross overflow.
