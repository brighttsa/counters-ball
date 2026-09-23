export function createPlayerCameraControls(control) {
  const root = document.createElement('section');
  root.className = 'player-camera'; root.setAttribute('aria-label', 'Match camera'); root.hidden = true;
  root.innerHTML = `<div class="camera-toolbar">
    <button type="button" id="camera-menu" aria-expanded="false" aria-controls="camera-panel">Camera</button>
    <button type="button" id="camera-peek" title="Hold for Tactical view">Tactical peek</button></div>
    <div id="camera-panel" hidden>
      <div class="camera-panel-heading"><strong>Match camera</strong><button type="button" id="camera-close">Close</button></div>
      <fieldset><legend>Camera angle</legend>${[['tactical','Tactical'],['broadcast','Broadcast'],['street','Street Level'],['free','Free Camera']]
        .map(([value, label]) => `<label><input type="radio" name="camera-view" value="${value}"><span>${label}</span></label>`).join('')}</fieldset>
      <div id="camera-free" hidden><div id="camera-orbit" tabindex="0" role="group" aria-label="Drag to orbit camera"></div>
        <div class="camera-orbit-buttons"><button data-orbit="-1" aria-label="Orbit left" title="Orbit left">&#8592;</button>
        <button data-tilt="-1" aria-label="Raise camera" title="Raise camera">&#8593;</button>
        <button data-tilt="1" aria-label="Lower camera" title="Lower camera">&#8595;</button>
        <button data-orbit="1" aria-label="Orbit right" title="Orbit right">&#8594;</button></div>
        <label class="camera-zoom">Zoom <input type="range" id="camera-zoom" min="0" max="100" value="50" aria-label="Camera zoom"></label>
      </div><button type="button" id="camera-reset">Reset camera</button>
    </div><output id="camera-status" aria-live="polite"></output>`;
  document.body.append(root);
  const find = id => root.querySelector(`#${id}`), panel = find('camera-panel'), menu = find('camera-menu');
  const close = (restoreFocus = false) => {
    panel.hidden = true; menu.setAttribute('aria-expanded', 'false');
    if (restoreFocus) menu.focus({ preventScroll: true });
  };
  menu.onclick = () => {
    control.cancelAim();
    if (!panel.hidden) { close(true); return; }
    panel.hidden = false; menu.setAttribute('aria-expanded', 'true');
    root.querySelector('[name="camera-view"]:checked')?.focus({ preventScroll: true });
  };
  find('camera-close').onclick = () => close(true);
  root.querySelectorAll('[name="camera-view"]').forEach(input => input.onchange = () => {
    control.select(input.value);
    if (input.value !== 'free') close(true);
  });
  find('camera-reset').onclick = () => { control.reset(); close(true); };
  // Capture Escape before the match's pause shortcut can handle it.
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || panel.hidden || root.hidden || document.body.dataset.screen !== 'match') return;
    e.preventDefault(); e.stopImmediatePropagation(); close(true);
  }, true);
  document.addEventListener('pointerdown', e => {
    if (root.contains(e.target)) return;
    close(); find('camera-status').textContent = '';
  }, true);
  root.addEventListener('focusout', e => { if (!root.contains(e.relatedTarget)) close(); });
  new MutationObserver(() => {
    close(); find('camera-status').textContent = ''; control.peek(false);
  }).observe(document.body, { attributes: true, attributeFilter: ['data-screen'] });
  root.querySelectorAll('[data-orbit]').forEach(b => b.onclick = () => control.orbit(Number(b.dataset.orbit) * .2, 0));
  root.querySelectorAll('[data-tilt]').forEach(b => b.onclick = () => control.orbit(0, Number(b.dataset.tilt) * .12));
  find('camera-zoom').oninput = e => control.zoom(Number(e.target.value) / 100);
  const peek = find('camera-peek');
  peek.onpointerdown = e => { if (e.button !== 0) return; e.preventDefault(); peek.setPointerCapture(e.pointerId); control.peek(true); };
  for (const type of ['pointerup','pointercancel','lostpointercapture']) peek.addEventListener(type, () => control.peek(false));
  peek.onkeydown = e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); control.peek(true); } };
  peek.onkeyup = e => { if ([' ', 'Enter'].includes(e.key)) control.peek(false); };
  peek.onblur = () => control.peek(false);
  root.addEventListener('pointerdown', () => control.cancelAim());
  window.addEventListener('blur', () => control.peek(false));
  window.addEventListener('keydown', e => {
    if (root.hidden || document.body.dataset.screen !== 'match' || e.repeat || e.altKey || e.ctrlKey || e.metaKey
      || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const mode = ({ '1':'tactical', '2':'broadcast', '3':'street' })[e.key];
    if (mode) { e.preventDefault(); control.select(mode); }
    if (e.key.toLowerCase() === 'c') { e.preventDefault(); control.cycle(); }
  });
  return { root, pad: find('camera-orbit'), notice: text => { find('camera-status').textContent = text; },
    sync(mode, active) {
      root.hidden = !active;
      root.querySelectorAll('[name="camera-view"]').forEach(input => { input.checked = input.value === mode; });
      find('camera-free').hidden = mode !== 'free';
      menu.textContent = `Camera: ${mode === 'street' ? 'Street Level' : mode[0].toUpperCase() + mode.slice(1)}`;
    },
  };
}
