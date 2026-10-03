import * as THREE from 'three';
import { createRendererSceneCamera } from '../../src/scene/scene-and-lighting-setup.js';
import { createPostProcessing } from '../../src/fx/post-processing-bloom-grain-haze.js';
import { buildLevelStage } from '../../src/scene/level-stage-builder-and-disposal.js';
import { CAMPAIGN_LEVELS, HOME_TEAM } from '../../src/levels/campaign-level-definitions.js';
import { createPromoTypography } from './promo-typography.js?v=5';
import { createImpactBurst } from './promo-impact-burst.js?v=2';
import { ballCueAt, cameraCueAt, capCueAt, timelineTextAt } from './promo-timeline.js?v=2';

function printRevealOnCap(mesh) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(165, 140, 15, 260, 260, 270);
  g.addColorStop(0, '#f2bd2c'); g.addColorStop(0.68, '#dd9f1e'); g.addColorStop(0.88, '#aa6e1d'); g.addColorStop(1, '#413a2c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(24,20,14,.58)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(256, 256, 220, 0, Math.PI * 2); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fdf6e6';
  ctx.font = '900 70px Anton, Impact, sans-serif'; ctx.fillText('NXWRTH', 256, 258, 420);
  for (let i = 0; i < 75; i++) { const x = (i * 83) % 512, y = (i * 139) % 512; ctx.fillStyle = `rgba(35,25,14,${(i % 7) / 55})`; ctx.fillRect(x, y, 2 + i % 5, 2); }
  const old = mesh.material[1];
  old.map?.dispose(); old.dispose();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  mesh.material[1] = new THREE.MeshStandardMaterial({ map: texture, metalness: 0.48, roughness: 0.48 });
}

export function createPromoCinematic(canvas, typeCanvas) {
  const { renderer, scene, camera } = createRendererSceneCamera(canvas);
  scene.add(camera);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  scene.background = new THREE.Color('#15100b');
  camera.near = 0.035; camera.far = 60;
  const level = CAMPAIGN_LEVELS.find((entry) => entry.id === 'roadside');
  const stage = buildLevelStage({ scene, renderer, camera, level, homeTeam: HOME_TEAM, awayTeam: level.opponent.team });
  const post = createPostProcessing(renderer, scene, camera);
  post.applyPreset(stage.preset);
  const headline = createPromoTypography(typeCanvas);
  const burst = createImpactBurst(scene);
  const blackout = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({
    color: 0x000000, depthTest: false, depthWrite: false, toneMapped: false,
  }));
  blackout.position.set(0, 0, -0.72);
  blackout.renderOrder = 30;
  camera.add(blackout);
  const hero = stage.caps.find((cap) => cap.side === 'home');
  const partner = stage.caps.find((cap) => cap.side === 'away');
  const graphicCap = stage.caps.find((cap) => cap.side === 'away' && cap !== partner);
  printRevealOnCap(graphicCap.mesh);
  graphicCap.mesh.visible = false;
  const extra = stage.caps.filter((cap) => cap !== hero && cap !== partner && cap !== graphicCap);
  hero.pivot.position.set(-0.58, 0, -0.05);
  partner.pivot.position.set(0.52, 0, 0.04);
  hero.pivot.scale.setScalar(1.5);

  function update(time, dt, tagTime, duration, aspect, reducedMotion = false) {
    const cue = cameraCueAt(time, tagTime, aspect);
    camera.position.fromArray(cue.position);
    camera.up.set(0, aspect < 0.8 ? 0 : 1, aspect < 0.8 ? -1 : 0);
    camera.lookAt(...cue.target);
    camera.fov = cue.fov + (cue.punch && !reducedMotion ? -2 : 0);
    camera.updateProjectionMatrix();
    const movement = capCueAt(time, tagTime);
    hero.pivot.position.set(movement.x, 0, movement.z);
    hero.pivot.rotation.y = movement.rotation;
    hero.pivot.scale.setScalar(time < 3.4 ? 1.5 : 1);
    const collision = Math.min(1, Math.max(0, (time - 3.4) / 0.3));
    partner.pivot.position.set(0.52 - collision * 0.18, 0, 0.04);
    partner.pivot.rotation.y = -collision * 4.2;
    const ball = ballCueAt(time);
    stage.ballMesh.position.set(ball.x, ball.y, ball.z);
    stage.ballMesh.rotation.set(ball.spin * 0.42, ball.spin, ball.spin * 0.7);
    const relativeTag = Number(tagTime);
    const revealed = tagTime !== null && Number.isFinite(relativeTag) && time >= relativeTag;
    graphicCap.mesh.visible = revealed;
    if (revealed) {
      const flight = Math.min(1, Math.max(0, (time - relativeTag) / 0.32));
      graphicCap.pivot.position.set(0.12 + flight * 0.12, 0, -flight * 0.1);
      graphicCap.pivot.rotation.set(0.15 + flight * 1.3, (time - relativeTag) * 8.5, (time - relativeTag) * 0.7);
      const scale = 2.3 * (1 + 0.35 * Math.max(0, 1 - flight));
      graphicCap.pivot.scale.setScalar(scale);
    } else {
      graphicCap.pivot.position.set(graphicCap.home[0], 0, graphicCap.home[1]);
      graphicCap.pivot.scale.setScalar(1);
      graphicCap.pivot.rotation.set(0, 0, 0);
    }
    blackout.visible = time < 0.16 || time >= duration - 1.8;
    extra.forEach((cap, i) => { cap.pivot.rotation.y = time * (0.2 + i * 0.025); });
    const message = timelineTextAt(time, duration, tagTime);
    headline.draw(message);
    const revealTime = Number(tagTime);
    post.setFocus(Number.isFinite(revealTime) && time >= revealTime - 0.5 && time <= revealTime + 2.3 ? 1.8 : 5);
    burst.update(time, tagTime, dt);
    post.update(dt, time);
    post.render();
  }

  function resize(width, height, outputWidth = width, outputHeight = height) {
    const aspect = width / height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(1);
    renderer.setSize(outputWidth, outputHeight, false);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    post.setSize(outputWidth, outputHeight);
    headline.resize(aspect, outputWidth);
  }

  return {
    renderer, camera, scene, update, resize,
    dispose() {
      headline.dispose(); burst.dispose();
      camera.remove(blackout); blackout.geometry.dispose(); blackout.material.dispose();
      scene.remove(camera);
      stage.dispose(); post.dispose?.(); renderer.dispose();
    },
  };
}
