export function createTableTalkCompactControl(root) {
  const button = root.querySelector('[data-table-talk-toggle]');
  const actions = root.querySelector('[data-table-talk-actions]');
  const microphone = root.querySelector('[data-table-talk-mic-shortcut]');
  let available = false;

  function setCompact(compact, state) {
    root.dataset.compact = String(compact);
    if (actions) actions.hidden = compact;
    if (!button) return;
    button.setAttribute('aria-expanded', String(!compact));
    const micOn = state === 'speaking';
    if (microphone) {
      microphone.hidden = !compact || !available;
      microphone.textContent = micOn ? 'Mute mic' : 'Turn mic on';
      microphone.setAttribute('aria-label', micOn ? 'Mute microphone' : 'Turn microphone on');
    }
    const micLabel = micOn ? 'Mic on' : 'Mic off';
    button.textContent = compact ? `Voice · ${micLabel}` : 'Hide voice controls';
    button.setAttribute('aria-label', `${compact ? 'Expand' : 'Collapse'} voice controls. Microphone ${micOn ? 'on' : 'off'}.`);
  }

  return {
    button,
    setCompact,
    setAvailable(value) {
      available = value;
      if (button) button.hidden = !available;
      if (microphone) microphone.hidden = !available || root.dataset.compact !== 'true';
    },
    focusIf(elements) {
      if (elements.includes(document.activeElement)) button?.focus();
    },
  };
}
