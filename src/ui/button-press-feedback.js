// Every button answers the moment a finger or mouse goes down, not when it lifts: a short cardboard tap
// and, on phones that allow it (Android; iPhone Safari offers no vibration to web pages), a tiny buzz.
// A press that is dragged away still counts as feedback given; the click that follows does not play twice.
const PRESS_BUZZ_MS = 8;
const RECENT_PRESS_MS = 700;

const pressable = (target) => target?.closest?.('button, [data-action], summary, [role="button"]');

export function installButtonPressFeedback(sound, root = document) {
  let lastPressed = null, lastAt = 0;
  root.addEventListener('pointerdown', (event) => {
    const el = pressable(event.target);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true' || el.id === 'boot-start') return; // the start gate clicks itself
    sound.unlock();
    if (el.classList.contains('locked')) sound.uiLocked();
    else if (el.classList.contains('btn-primary')) sound.uiSelect();
    else sound.uiTick();
    try { navigator.vibrate?.(PRESS_BUZZ_MS); } catch { /* not allowed here */ }
    lastPressed = el;
    lastAt = performance.now();
  }, { capture: true, passive: true });

  /** True when this element already gave press feedback (so the click handler stays quiet). */
  return (el) => el === lastPressed && performance.now() - lastAt < RECENT_PRESS_MS;
}
