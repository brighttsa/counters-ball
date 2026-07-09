// Counters Ball 3D — bootstrap and game loop. Wires the scene, physics,
// input, post effects and score/turn state together.
import * as THREE from 'three';
import {
  createRendererAndScene, addLateAfternoonLighting,
  CAMERA_BASE_POSITION, CAMERA_BASE_TARGET,
} from './scene-and-lighting-setup.js';
import { buildCardboardPitchTable } from './cardboard-pitch-surface.js';
import { buildBottleCapTeams } from './bottle-cap-players.js';
import { buildPaperMatchBall, buildMatchstickGoals } from './match-ball-and-goal-posts.js';
import { buildStreetBackgroundEnvironment } from './street-background-environment.js';
import { FlickPhysicsEngine } from './flick-physics-engine.js';
import { AimInputControls } from './aim-input-controls.js';
import { createPostProcessingAndCelebration } from './post-processing-and-celebration.js';
import {
  BALL_RADIUS, CAP_HEIGHT, TEAM_RED, TEAM_GREEN,
} from './pitch-dimensions-and-constants.js';

const canvas = document.getElementById('game-canvas');
const { renderer, scene, camera } = createRendererAndScene(canvas);
addLateAfternoonLighting(scene);

buildCardboardPitchTable(scene);
const caps = buildBottleCapTeams(scene);
const ballMesh = buildPaperMatchBall(scene);
const { postBodies } = buildMatchstickGoals(scene);
const environment = buildStreetBackgroundEnvironment(scene);
const post = createPostProcessingAndCelebration(renderer, scene, camera);

// ---- Physics bodies -------------------------------------------------------
const physics = new FlickPhysicsEngine();
const capEntries = caps.map((cap) => ({
  mesh: cap.mesh,
  team: cap.team,
  body: physics.addBody({
    mesh: cap.mesh, x: cap.home[0], z: cap.home[1],
    radius: cap.radius, mass: 1, kind: 'cap', team: cap.team,
  }),
  home: cap.home,
}));
const ballBody = physics.addBody({
  mesh: ballMesh, x: 0, z: 0, radius: BALL_RADIUS, mass: 0.12, kind: 'ball',
});
postBodies.forEach((p) => physics.addStaticPost(p));

// ---- Score / turn state ---------------------------------------------------
const ui = {
  scoreRed: document.getElementById('score-red'),
  scoreGreen: document.getElementById('score-green'),
  dotRed: document.getElementById('turn-dot-red'),
  dotGreen: document.getElementById('turn-dot-green'),
  banner: document.getElementById('goal-banner'),
  scorerLabel: document.getElementById('goal-scorer-label'),
  hint: document.getElementById('flick-hint'),
};
const state = { turn: TEAM_RED, moving: false, scores: { red: 0, green: 0 } };

function setTurn(team) {
  state.turn = team;
  ui.dotRed.classList.toggle('inactive', team !== TEAM_RED);
  ui.dotGreen.classList.toggle('inactive', team !== TEAM_GREEN);
}

function resetToKickoff(concedingTeam) {
  for (const entry of capEntries) {
    entry.body.pos.set(entry.home[0], entry.home[1]);
    entry.body.vel.set(0, 0);
  }
  ballBody.pos.set(0, 0);
  ballBody.vel.set(0, 0);
  physics.goalCooldown = false;
  state.moving = false;
  setTurn(concedingTeam);
}

physics.onGoalScored = (sideCrossed) => {
  // Red attacks +x, green attacks -x; whoever's goal the ball entered concedes.
  const scorer = sideCrossed > 0 ? TEAM_RED : TEAM_GREEN;
  const conceder = scorer === TEAM_RED ? TEAM_GREEN : TEAM_RED;
  state.scores[scorer] += 1;
  ui.scoreRed.textContent = state.scores.red;
  ui.scoreGreen.textContent = state.scores.green;
  ui.scorerLabel.textContent = scorer === TEAM_RED ? 'ACCRA REDS SCORE!' : 'KUMASI GREENS SCORE!';
  ui.banner.classList.add('show');
  post.startGoalCelebration(sideCrossed * 1.5);
  setTimeout(() => {
    ui.banner.classList.remove('show');
    resetToKickoff(conceder);
  }, 2400);
};

// ---- Input ----------------------------------------------------------------
const input = new AimInputControls({
  camera, domElement: canvas, scene, capEntries,
  canAim: (team) => team === state.turn && !state.moving
    && !post.isCelebrating() && physics.allBodiesResting(),
  onFlick: (body, velocity) => {
    body.vel.copy(velocity);
    state.moving = true;
    ui.hint.classList.add('faded');
  },
});

// ---- Camera: idle drift + celebration push-in + shake ----------------------
const camPos = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const goalViewPos = new THREE.Vector3();
const camDirection = CAMERA_BASE_POSITION.clone().sub(CAMERA_BASE_TARGET).normalize();
let fitDistance = 0;

// Pull the camera back on narrow viewports so the full pitch always fits.
function computeFitDistance() {
  const halfVFovTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const neededForWidth = 1.85 / (halfVFovTan * camera.aspect);
  const neededForDepth = 1.55 / halfVFovTan;
  fitDistance = Math.max(3.85, neededForWidth, neededForDepth);
  scene.fog.near = fitDistance + 2.2;
  scene.fog.far = fitDistance + 15;
}

function updateCamera(t, fx) {
  camPos.copy(CAMERA_BASE_TARGET).addScaledVector(camDirection, fitDistance);
  camPos.x += Math.sin(t * 0.22) * 0.03;      // slow handheld breathing
  camPos.y += Math.sin(t * 0.31 + 1.4) * 0.018;
  camTarget.copy(CAMERA_BASE_TARGET);
  if (fx.pushIn > 0) {
    goalViewPos.set(fx.focus.x * 0.55, 1.35, fx.focus.z + 1.55);
    camPos.lerp(goalViewPos, fx.pushIn * 0.55);
    camTarget.lerp(fx.focus, fx.pushIn * 0.8);
  }
  camPos.add(fx.shake);
  camera.position.copy(camPos);
  camera.lookAt(camTarget);
}

// ---- Mesh sync ------------------------------------------------------------
const rollAxis = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function syncMeshesToPhysics(dt) {
  for (const entry of capEntries) {
    const b = entry.body;
    entry.mesh.position.set(b.pos.x, entry.mesh.position.y, b.pos.y);
    const speed = b.vel.length();
    if (speed > 0.01) entry.mesh.rotation.y += speed * dt * 2.2; // sliding spin
  }
  ballMesh.position.set(ballBody.pos.x, BALL_RADIUS * 0.92, ballBody.pos.y);
  const speed = ballBody.vel.length();
  if (speed > 0.01) {
    rollAxis.set(ballBody.vel.x, 0, ballBody.vel.y).normalize();
    rollAxis.crossVectors(UP, rollAxis);
    ballMesh.rotateOnWorldAxis(rollAxis.normalize(), (-speed * dt) / BALL_RADIUS);
  }
}

// ---- Main loop --------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // Physics deliberately keeps running through the goal celebration: the
  // push-in camera watches the ball rattle off the back batten and settle.
  physics.step(dt);
  if (state.moving && physics.allBodiesResting() && !post.isCelebrating()) {
    state.moving = false; // play resolved with no goal: other team's flick
    setTurn(state.turn === TEAM_RED ? TEAM_GREEN : TEAM_RED);
  }

  syncMeshesToPhysics(dt);
  environment.updateDustMotes(t, dt);
  input.update(t);
  const fx = post.update(dt, t);
  updateCamera(t, fx);
  post.render();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // display may change
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
  computeFitDistance();
});

computeFitDistance();
setTurn(TEAM_RED);
animate();

// Debug handle for automated verification (harmless in production).
window.__countersBall = { physics, state, capEntries, ballBody, camera };
