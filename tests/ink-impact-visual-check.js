const frame = document.getElementById('game'), status = document.getElementById('status');
let handle;
const session = () => handle.app.session;
let releaseEvent;
document.getElementById('camera-settle').onclick = () => {
  for (let i = 0; i < 120; i++) session().cameraDirector.update(1 / 60, i / 60);
  session().post.render();
};
document.getElementById('camera-state').onclick = () => {
  const s = session(), c = s.cameraDirector.playerControl;
  status.textContent = JSON.stringify({ mode: c.mode, peeking: c.peeking, side: c.side,
    selected: Boolean(s.input.selected), phase: s.rules.phase, used: s.rules.flicksUsed,
    position: s.camera.position.toArray(), bodies: s.physics.bodies.map(b => [b.pos.x, b.pos.y, b.vel.x, b.vel.y]) });
};
document.getElementById('camera-drag').onclick = () => {
  const s = session(), e = s.entries.find(e => s.rules.canFlick(e.side));
  if (!e) return;
  const rect = s.canvas.getBoundingClientRect();
  const point = e.mesh.getWorldPosition(s.input.projected).project(s.camera);
  const event = { clientX: rect.left + (point.x + 1) * rect.width / 2,
    clientY: rect.top + (1 - point.y) * rect.height / 2, pointerId: 901, button: 0, pointerType: 'touch', timeStamp: 0 };
  s.input.onDown(event);
  releaseEvent = { ...event, clientY: event.clientY + 45, timeStamp: 300 };
  s.input.onMove(releaseEvent);
  status.textContent = `Test drag: ${Boolean(s.input.selected)} / ${s.input.pull.length()}`;
};
document.getElementById('camera-release').onclick = () => { if (releaseEvent) session().input.onUp(releaseEvent); };
frame.onload = () => { handle = frame.contentWindow.__countersBall; status.textContent = handle ? 'Ready' : 'Boot failed'; };
document.getElementById('width').onchange = e => {
  frame.style.width = `${e.target.value}px`;
  frame.style.height = `${({ 568: 320, 844: 390, 768: 1024, 1024: 768, 1280: 720 })[e.target.value] ?? 844}px`;
};
document.getElementById('layout-check').onclick = () => {
  const doc = frame.contentDocument;
  const names = ['.scoreboard', '.flick-meter', '.legend-objective', '.pause-btn', '.turn-banner', '.camera-toolbar', '.sound-btn'];
  const boxes = names.map(name => [name, doc.querySelector(name)?.getBoundingClientRect()]).filter(([, r]) => r?.width && r?.height);
  const overlaps = boxes.flatMap(([a, x], i) => boxes.slice(i + 1).filter(([, y]) =>
    x.left < y.right && x.right > y.left && x.top < y.bottom && x.bottom > y.top).map(([b]) => `${a}/${b}`));
  status.textContent = JSON.stringify({ width: frame.clientWidth, height: frame.clientHeight, overlaps,
    clipped: boxes.filter(([, r]) => r.left < 0 || r.top < 0 || r.right > frame.clientWidth || r.bottom > frame.clientHeight).map(([n]) => n) });
};
document.getElementById('home').onclick = () => handle.actions['back-to-title']();
document.getElementById('start').onclick = () => {
  handle.app.mode = document.getElementById('mode').value;
  const track = handle.app.mode === 'legends' ? handle.legends : handle.levels;
  handle.actions['select-level']({ dataset: { index: String(track.findIndex(l => l.backdrop === document.getElementById('venue').value)) } });
  if (!frame.contentDocument.querySelector('.match-orientation-prompt[open]')) handle.actions['kick-off']();
};
document.getElementById('advance').onclick = () => {
  const s = session();
  for (let i = 0; i < 120; i++) { s.update(1 / 60, i / 60); s.cameraDirector.update(1 / 60, i / 60); }
  s.post.render();
  status.textContent = `${s.level.name} / ${s.rules.phase} / ${s.rules.scores.home}-${s.rules.scores.away}`;
};
document.getElementById('ui').onclick = () => {
  const hud = frame.contentDocument.getElementById('hud'); hud.hidden = !hud.hidden;
};
document.getElementById('aim').onclick = () => {
  const s = session(), entry = s.entries.find(e => e.side === 'home' && e.home[0] === -.42);
  const pull = s.ballBody.pos.clone().sub(entry.body.pos).normalize().multiplyScalar(.65);
  s.visuals.show(entry.body, pull); s.cameraDirector.setAimLocked(true);
};
document.getElementById('shot').onclick = async () => {
  const s = session();
  if (s.rules.phase !== 'aiming' || s.mechanic?.busy) return;
  const { planAiShot, AI_DIFFICULTY } = await import('../src/gameplay/ai-opponent-shot-planner.js');
  status.textContent = 'Planning against real physics';
  const result = await planAiShot({ physics: s.physics, capBodies: s.entriesForSide('home').map(e => e.body),
    ballBody: s.ballBody, side: 'home', difficulty: AI_DIFFICULTY.champion, rng: () => .5, mechanic: s.mechanic,
    yieldToFrame: () => Promise.resolve(), isCancelled: () => session() !== s });
  if (!result || session() !== s) return;
  s.cameraDirector.setAimLocked(false);
  s.flick(s.entries.find(e => e.body === result.body), result.velocity);
  status.textContent = 'Real flick launched';
};
document.getElementById('refresh').onclick = async () => {
  await Promise.all(frame.contentWindow.performance.getEntriesByType('resource').map(r => fetch(r.name, { cache: 'reload' })));
  frame.contentWindow.location.reload();
};
document.getElementById('sample').onclick = () => {
  const s = session(); s.post.render();
  const gl = s.renderer.getContext(), pixels = new Uint8Array(1024);
  gl.readPixels(gl.drawingBufferWidth / 2 - 8, gl.drawingBufferHeight / 2 - 8, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  status.textContent = `${frame.clientWidth}px / ${new Set(pixels).size} pixel values / ${s.rules.phase} / ${s.rules.scores.home}-${s.rules.scores.away}`;
};
