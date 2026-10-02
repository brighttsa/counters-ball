export function createTableTalkCompactControl(root) {
  const button = root.querySelector('[data-table-talk-toggle]');
  const actions = root.querySelector('[data-table-talk-actions]');

  function setCompact(compact, state) {
    root.dataset.compact = String(compact);
    if (actions) actions.hidden = compact;
    if (!button) return;
    button.setAttribute('aria-expanded', String(!compact));
    const micOn = state === 'speaking';
    const micLabel = micOn ? 'Mic on' : 'Mic off';
    button.textContent = compact ? `Voice · ${micLabel}` : 'Hide voice controls';
    button.setAttribute('aria-label', `${compact ? 'Expand' : 'Collapse'} voice controls. Microphone ${micOn ? 'on' : 'off'}.`);
  }

  return {
    button,
    setCompact,
    setAvailable: available => { if (button) button.hidden = !available; },
    focusIf(elements) {
      if (elements.includes(document.activeElement)) button?.focus();
    },
  };
}
