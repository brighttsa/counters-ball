// The pause card has two faces. The front holds what you do mid-match (Resume, Restart, How to play,
// Quit); "Settings" turns the card over. The back shows every preference with all of its options as
// chalk chips, so the current choice is always visible and any other is one tap away.

const doc = () => globalThis.document;

/** Mark the chip for `value` in one settings group as chosen and every other chip in it as not. */
export function markChoice(group, value) {
  doc()?.querySelectorAll?.(`[data-choice="${group}"]`).forEach((chip) => {
    chip.setAttribute('aria-pressed', String(chip.dataset.value === String(value)));
  });
}

export function selectSettingsSection(section) {
  const card = doc()?.getElementById('pause-card');
  if (!card || !['sound', 'camera', 'table'].includes(section)) return;
  card.dataset.settingsSection = section;
  card.querySelectorAll('.settings-tab').forEach(tab => {
    tab.setAttribute('aria-pressed', String(tab.dataset.section === section));
  });
}

/** Turn the pause card to 'actions' (front) or 'settings' (back) and focus that face's main button. */
export function showPauseFace(face) {
  const card = doc()?.getElementById('pause-card');
  if (!card) return;
  card.dataset.face = face;
  for (const panel of card.querySelectorAll('[data-face-panel]')) panel.hidden = panel.dataset.facePanel !== face;
  if (face === 'settings') selectSettingsSection('sound');
  card.querySelector(`[data-face-panel="${face}"] .btn-primary`)?.focus({ preventScroll: true });
}

export const pauseFace = () => doc()?.getElementById('pause-card')?.dataset.face ?? 'actions';
