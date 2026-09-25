// "Tap to play": browsers keep a page silent until the first tap, click or key press, so the loading
// screen ends on a start prompt instead of fading out on its own. That first gesture unlocks audio,
// confirms it with a UI tick, and reveals the game, so nobody meets a silent menu and taps ♪ by mistake.

/**
 * @param bootScreen the loading screen element (contains #boot-start)
 * @param onStart called inside the gesture: unlock audio there
 */
export function openTapToPlayGate(bootScreen, onStart) {
  const button = bootScreen?.querySelector('#boot-start');
  if (!bootScreen || !button) { finish(); return; }
  document.body.classList.add('awaiting-start');
  bootScreen.setAttribute('aria-label', 'KONK! is ready');
  button.hidden = false;
  button.focus({ preventScroll: true });

  let started = false;
  const start = (event) => {
    if (started) return;
    if (event?.type === 'keydown' && (event.metaKey || event.ctrlKey || event.altKey)) return; // browser shortcuts
    started = true;
    // The start gesture belongs to this screen alone: without this, the same Enter or tap went on to
    // press Play on the title screen underneath.
    event?.preventDefault();
    event?.stopImmediatePropagation();
    bootScreen.removeEventListener('click', start, true);
    window.removeEventListener('keydown', start, true);
    onStart();
    finish();
  };
  bootScreen.addEventListener('click', start, true);
  window.addEventListener('keydown', start, true); // capture: runs before the game's own key handlers

  function finish() {
    document.body.classList.remove('is-loading', 'awaiting-start');
    bootScreen?.setAttribute('aria-hidden', 'true');
  }
}
