const frame = document.getElementById('game'), status = document.getElementById('status');
let handle;
const session = () => handle.app.session;
frame.onload = () => { handle = frame.contentWindow.__countersBall; status.textContent = handle ? 'Ready' : 'Boot failed'; };
document.getElementById('width').onchange = e => {
  frame.style.width = `${e.target.value}px`; frame.style.height = e.target.value === '1280' ? '720px' : '844px';
};
document.getElementById('home').onclick = () => handle.actions['back-to-title']();
document.getElementById('start').onclick = () => {
  handle.app.mode = 'legends';
  handle.actions['select-level']({ dataset: { index: String(handle.legends.findIndex(l => l.id === 'legends-roadside-act-1')) } });
  handle.actions['kick-off']();
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
