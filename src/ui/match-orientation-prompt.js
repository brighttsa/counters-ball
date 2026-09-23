// Defer match creation, not an active turn: rotation never spends a flick.
export class MatchOrientationGate {
  constructor({ isPortrait, show, hide }) {
    Object.assign(this, { isPortrait, show, hide, accepted: false, pending: null });
  }
  offer(start) {
    if (this.accepted || !this.isPortrait()) return false;
    this.pending = start; this.show();
    return true;
  }
  continue() {
    if (!this.pending) return;
    const start = this.pending;
    this.pending = null; this.accepted = true; this.hide(); start();
  }
  cancel() { this.pending = null; this.hide(); }
  resize() { if (!this.isPortrait()) this.continue(); }
}

export function createMatchOrientationPrompt() {
  const portrait = window.matchMedia('(orientation: portrait) and (max-width: 1024px)');
  const dialog = document.createElement('dialog');
  dialog.className = 'match-orientation-prompt';
  dialog.setAttribute('aria-labelledby', 'orientation-heading');
  dialog.setAttribute('aria-describedby', 'orientation-description');
  dialog.innerHTML = `<p class="orientation-kicker">KONK!</p>
    <h2 id="orientation-heading">A wider view of the game.</h2>
    <p id="orientation-description">Turn your phone or tablet sideways for landscape play.</p>
    <div class="orientation-actions"><button type="button" id="portrait-play" autofocus>Play in portrait</button>
    <button type="button" id="orientation-back">Back</button></div>`;
  document.body.append(dialog);
  const gate = new MatchOrientationGate({ isPortrait: () => portrait.matches,
    show: () => { if (!dialog.open) dialog.showModal(); }, hide: () => dialog.close() });
  dialog.querySelector('#portrait-play').onclick = () => gate.continue();
  dialog.querySelector('#orientation-back').onclick = () => gate.cancel();
  dialog.addEventListener('cancel', e => { e.preventDefault(); gate.cancel(); });
  portrait.addEventListener('change', () => gate.resize());
  return gate;
}
