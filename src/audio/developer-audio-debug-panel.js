export function installDeveloperAudioDebugPanel(sound) {
  if (new URLSearchParams(location.search).get('audioDebug') !== '1') return null;
  const panel = document.createElement('aside');
  panel.className = 'audio-debug-panel';
  panel.innerHTML = `<strong>AUDIO DEBUG</strong><output></output><div class="audio-debug-actions"></div>`;
  const actions = panel.querySelector('.audio-debug-actions');
  for (const [label, event, strength] of [
    ['Flick L', 'flick', 0.15], ['Flick M', 'flick', 0.5], ['Flick H', 'flick', 0.9],
    ['Cap / cap', 'cap-cap', 0.65], ['Cap / ball', 'cap-ball', 0.65], ['Post', 'post', 0.75],
    ['Slide', 'slide', 0.7], ['Settle', 'settle', 0.1],
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => { sound.unlock(); sound.audition?.(event, strength); });
    actions.append(button);
  }
  document.body.append(panel);
  const output = panel.querySelector('output');
  const refresh = () => {
    if (!panel.isConnected) return;
    const state = sound.debugSnapshot?.() ?? {};
    output.textContent = [
      `event   ${state.event ?? '-'}`, `sample  ${state.sample ?? '-'}`,
      `force   ${state.strength ?? '-'}`, `speed   ${state.speed ?? '-'}`,
      `surface ${state.surface ?? '-'}`, `voices  ${state.voices ?? 0}`,
      `gain    ${state.gain ?? '-'}`, `venue   ${state.ambience ?? '-'}`,
      `music   ${state.music ?? '-'}`, `ducking ${state.ducking ? 'yes' : 'no'}`,
      `loaded  ${state.loaded ?? 0}`, `paused  ${state.paused ? 'yes' : 'no'}`,
    ].join('\n');
    requestAnimationFrame(refresh);
  };
  refresh();
  return panel;
}
