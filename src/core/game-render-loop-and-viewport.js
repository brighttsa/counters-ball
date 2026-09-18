// One presentation clock freezes with pause; simulation retains its fixed-step clock.
export function startGameRenderLoop({ app, camera, cameraDirector, renderer, post }) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const syncMotion = () => {
    if (motion.matches) {
      cameraDirector.setMotion(false);
      if (app.session?.presentation.replay.active) app.session.presentation.finishReplay();
    }
    document.getElementById('camera-motion-toggle')?.setAttribute('aria-pressed', String(cameraDirector.motionEnabled));
  };
  motion.addEventListener('change', syncMotion);
  syncMotion();
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    post.setSize(window.innerWidth, window.innerHeight);
    cameraDirector.fitToViewport();
  });
  let lastFrame = performance.now(), time = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min((now - lastFrame) / 1000, 0.05));
    lastFrame = now;
    if (!app.paused) time += dt;
    app.session?.update(dt, time);
    if (!app.paused) cameraDirector.update(dt, time);
    post.setFocus(cameraDirector.focusDistance);
    if (!app.paused) post.update(dt, time);
    post.render();
  }
  requestAnimationFrame(frame);
}
