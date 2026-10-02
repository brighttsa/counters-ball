# Table Talk Compact Control

Date: 2026-10-02
Owner: Codex

Added a compact labeled voice toggle that appears after a healthy Table Talk connection. The pill keeps microphone state visible, auto-collapses once with the mic still off, and preserves manual expansion through later voice updates and lobby/match relocation. Playback and microphone recovery stay expanded and actionable. A small UI helper owns the compact-control presentation; the existing session/transport flow remains unchanged.

Keyboard focus moves from either Join entry point to the connecting status, then to the pill before the action row hides. The status has a visible focus ring, the toggle exposes `aria-expanded` and `aria-controls`, and the live mic state is announced outside the collapsible region. The target remains at least 44px, with reduced-motion support.

Verification: 33 focused voice tests and 437 full tests pass; source syntax and diff checks are clean. Browser fixture reviewed at 375×812, 844×390, and 1440×900, including mouse and Enter-key toggles. It uses relative positioning and therefore does not certify fixed placement over the actual match HUD. A real LiveKit connection, physical-device pass, and browser reduced-motion emulation remain unverified. The local Worker lacked voice provider credentials. CSS and the game module import chain use new cache versions for rollout.
