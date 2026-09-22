// Manual visual harness uses the real app, stage, input, physics and render loop.
const frame = document.getElementById('game'), venue = document.getElementById('venue');
let handle, session;
function sample() {
  session.post.render();
  const gl = session.renderer.getContext(), pixels = new Uint8Array(16 * 16 * 4);
  gl.readPixels(Math.floor(gl.drawingBufferWidth / 2) - 8, Math.floor(gl.drawingBufferHeight / 2) - 8,
    16, 16, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  document.getElementById('status').textContent = `Canvas ${new Set(pixels).size} values; ${session.level.id}; ${session.rules.phase}`;
}
function loadVenue() {
  handle.app.mode = 'versus';
  handle.actions['select-level']({ dataset: { index: venue.value || '0' } });
  handle.actions['kick-off'](); session = handle.app.session;
  session.cameraDirector.setMotion(false);
  session.cameraDirector.update(1 / 60, 0);
  session.hud.show(false); session.hideTutorial();
  frame.contentDocument.getElementById('sound-toggle').style.visibility = 'hidden';
  sample();
}
frame.addEventListener('load', () => {
  handle = frame.contentWindow.__countersBall;
  if (!handle) { document.getElementById('status').textContent = 'Game failed to initialize'; return; }
  frame.contentWindow.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('clean')) {
      document.body.classList.remove('clean'); e.stopImmediatePropagation();
    }
  }, true);
  venue.replaceChildren(...handle.levels.map((level, index) => new Option(level.name, index)));
  loadVenue();
});
venue.onchange = loadVenue;
document.getElementById('view').onclick = () => { session.hud.show(false); session.hideTutorial(); sample(); };
for (const [id, power] of [['low', 0.2], ['mid', 0.55], ['high', 1]]) {
  document.getElementById(id).onclick = () => {
    session.input.cancel();
    const entry = session.entries.find(e => e.side === 'home' && e.home[0] === -0.42);
    const pull = entry.body.pos.clone().negate().normalize().multiplyScalar(0.85 * power);
    session.visuals.show(entry.body, pull); session.juice.press(entry, pull, power);
    session.cameraDirector.setAimLocked(true); sample();
  };
}
document.getElementById('release').onclick = () => {
  const aim = session.visuals, entry = session.entries.find(e => e.body === aim.activeBody);
  if (!entry) return;
  const velocity = entry.body.pos.clone().set(aim.pull.x, aim.pull.y).normalize().multiplyScalar(aim.power * 3.4);
  session.cameraDirector.setAimLocked(false); session.flick(entry, velocity); sample();
};
document.getElementById('intro').onclick = () => {
  session.visuals.hide(); session.cameraDirector.setMotion(true); session.cameraDirector.playIntro(2.8);
  session.cameraDirector.update(0, 0); sample();
};
document.getElementById('measure').onclick = () => {
  let start, last, frames = 0, moved = false;
  const measure = now => {
    start ??= now; frames++;
    moved ||= Boolean(last && now !== last); last = now;
    if (now - start < 1500) return requestAnimationFrame(measure);
    sample();
    document.getElementById('status').textContent += `; ${(frames * 1000 / (now - start)).toFixed(1)} frames/s; clock ${moved}`;
  };
  requestAnimationFrame(measure);
};
document.getElementById('clean').onclick = () => document.body.classList.add('clean');
document.getElementById('refresh').onclick = async () => {
  await Promise.all(frame.contentWindow.performance.getEntriesByType('resource')
    .map(resource => fetch(resource.name, { cache: 'reload' })));
  frame.contentWindow.location.reload();
};
window.addEventListener('keydown', e => { if (e.key === 'Escape') document.body.classList.remove('clean'); });
