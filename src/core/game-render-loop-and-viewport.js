// One presentation clock freezes with pause; simulation retains its fixed-step clock.
import { markChoice } from '../ui/pause-card-faces-and-setting-chips.js';

function readViewportSize() {
  const viewport = window.visualViewport;
  return {
    width: viewport?.width || document.documentElement?.clientWidth || window.innerWidth,
    height: viewport?.height || document.documentElement?.clientHeight || window.innerHeight,
  };
}

/** @param onFrame (dt) => void, after the camera has settled for this frame and before it is drawn */
export function startGameRenderLoop({ app, camera, cameraDirector, renderer, post, onFrame }) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const syncMotion = () => {
    if (motion.matches) {
      cameraDirector.setMotion(false);
      if (app.session?.presentation.replay.active) app.session.presentation.finishReplay();
    }
    markChoice('motion', cameraDirector.motionEnabled ? 'on' : 'off');
  };
  motion.addEventListener('change', syncMotion);
  syncMotion();
  const size = () => readViewportSize();
  const hasViewport = () => { const { width, height } = size(); return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0; };
  let suspended = !hasViewport();
  window.addEventListener('resize', () => {
    if (!hasViewport()) {
      suspended = true;
      return;
    }
    const { width, height } = size();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    post.setSize(width, height);
    cameraDirector.fitToViewport();
  });
  let lastFrame = performance.now(), time = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = suspended ? 0 : Math.max(0, Math.min((now - lastFrame) / 1000, 0.05));
    lastFrame = now;
    if (!hasViewport()) {
      suspended = true;
      return;
    }
    suspended = false;
    if (!app.paused) time += dt;
    app.session?.update(dt, time);
    if (!app.paused) cameraDirector.update(dt, time);
    onFrame?.(dt);
    post.setFocus(cameraDirector.focusDistance);
    if (!app.paused) post.update(dt, time);
    post.render();
  }
  requestAnimationFrame(frame);
}
