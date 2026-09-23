// Scoreboard chalked onto the pitch itself, just inside the touchline nearest
// the camera (where the player leans over the table): the score at halfway, and each side's remaining flicks as
// tally gates in its own half. Each mark turns to face the camera so it stays
// readable in landscape, portrait and the free camera.
import * as THREE from 'three';
import { PITCH_HALF_WIDTH, SIDE_HOME, SIDE_AWAY } from '../core/pitch-dimensions-and-constants.js';

const TOUCHLINE_CLEARANCE = 0.05; // chalk stops just short of the painted touchline
const TALLY_X = 0.82;
const SCORE_SIZE = [0.72, 0.27]; // world units, matches the 512x192 canvas; clears the centre circle
const TALLY_SIZE = [0.92, 0.23];  // world units, matches the 512x128 canvas
const CHALK_WHITE = '#f5f1df'; // matches --paper in the stylesheets
const MAX_TALLIES = 25; // beyond five gates, a number reads faster than marks
const SIDE_FLIP_MARGIN = 0.35; // hysteresis: a camera near the pitch axis must not make the chalk jump

/** Remaining flicks as tally gates of five, e.g. 14 → [5, 5, 4]; null when too many to draw. */
export function tallyGroups(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n > MAX_TALLIES) return null;
  return Array.from({ length: Math.ceil(n / 5) }, (_, i) => Math.min(5, n - i * 5));
}

/** Rubbed chalk is a team colour pushed most of the way to white, so green reads on cardboard. */
export function chalkTint(hex, amount = 0.45) {
  const a = new THREE.Color(hex), b = new THREE.Color(CHALK_WHITE);
  return `#${a.lerp(b, amount).getHexString()}`;
}

/** Which touchline (+1 / -1 in z) is nearest the camera, keeping the previous one near the axis. */
export function nearTouchlineSign(cameraZ, previous = 1) {
  if (cameraZ > SIDE_FLIP_MARGIN) return 1;
  if (cameraZ < -SIDE_FLIP_MARGIN) return -1;
  return previous;
}

function chalkSurface(width, height, pixelWidth, pixelHeight) {
  const canvas = document.createElement('canvas');
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, opacity: 1, depthWrite: false, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -2,
  }));
  mesh.rotation.order = 'YXZ';
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  return { mesh, ctx: canvas.getContext('2d'), texture };
}

// Rubbed-in chalk: several slightly offset passes, then grain knocked out of the dust.
function chalkify(ctx, draw) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  for (const [dx, dy, alpha] of [[0, 0, 0.75], [1.5, -1, 0.4], [-1, 1.5, 0.35]]) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(dx, dy);
    draw(ctx);
    ctx.restore();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < (width * height) / 90; i++) {
    ctx.globalAlpha = 0.25 + Math.random() * 0.55;
    ctx.fillRect(Math.random() * width, Math.random() * height, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  ctx.restore();
}

function drawTallies(ctx, count, colour) {
  const groups = tallyGroups(count);
  const { width, height } = ctx.canvas;
  chalkify(ctx, (c) => {
    c.strokeStyle = colour;
    c.fillStyle = colour;
    c.lineCap = 'round';
    if (!groups) {
      c.font = `700 ${height * 0.7}px 'Cabin Sketch', 'Chalkboard SE', cursive`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(String(count), width / 2, height / 2);
      return;
    }
    if (!groups.length) return;
    // Gates of four strokes three steps wide, 1.4 steps apart, scaled to fill the panel.
    const step = Math.min(30, (width * 0.92) / (groups.length * 4.4 - 1.4));
    const gap = step * 1.4, groupWidth = step * 3;
    c.lineWidth = Math.max(6, step * 0.36);
    const last = Math.min(groups.at(-1), 4);
    const total = (groups.length - 1) * (groupWidth + gap) + (last - 1) * step;
    let x = (width - total) / 2;
    const top = height * 0.12, bottom = height * 0.88;
    for (const g of groups) {
      const start = x;
      for (let i = 0; i < Math.min(g, 4); i++, x += step) {
        c.beginPath();
        c.moveTo(x + Math.sin(x) * 3, top);
        c.lineTo(x - Math.cos(x) * 3, bottom);
        c.stroke();
      }
      if (g === 5) { // the gate: a diagonal struck through the four
        c.beginPath();
        c.moveTo(start - step * 0.5, bottom - step * 0.3);
        c.lineTo(start + groupWidth + step * 0.5, top + step * 0.3);
        c.stroke();
      }
      x = start + groupWidth + gap;
    }
  });
}

function drawScore(ctx, scores, colours) {
  const { width, height } = ctx.canvas;
  chalkify(ctx, (c) => {
    const parts = [[String(scores.home), colours.home], [' — ', CHALK_WHITE], [String(scores.away), colours.away]];
    const fontFor = (size) => `700 ${size}px 'Cabin Sketch', 'Chalkboard SE', cursive`;
    const measure = () => parts.reduce((sum, [text]) => sum + c.measureText(text).width, 0);
    c.font = fontFor(height * 0.95);
    c.font = fontFor(height * 0.95 * Math.min(1, (width * 0.94) / measure())); // fill the panel, never overflow
    c.textBaseline = 'middle';
    let x = (width - measure()) / 2;
    for (const [text, colour] of parts) {
      c.fillStyle = colour;
      c.fillText(text, x, height * 0.54);
      x += c.measureText(text).width;
    }
  });
}

export function createChalkTableScoreboard(parent, homeColour, awayColour) {
  const root = new THREE.Group();
  root.name = 'chalk-table-scoreboard';
  const colours = { [SIDE_HOME]: chalkTint(homeColour), [SIDE_AWAY]: chalkTint(awayColour) };
  const score = chalkSurface(...SCORE_SIZE, 512, 192);
  const tallies = {
    [SIDE_HOME]: chalkSurface(...TALLY_SIZE, 512, 128),
    [SIDE_AWAY]: chalkSurface(...TALLY_SIZE, 512, 128),
  };
  score.mesh.position.set(0, 0.004, 0);
  tallies[SIDE_HOME].mesh.position.set(-TALLY_X, 0.004, 0);
  tallies[SIDE_AWAY].mesh.position.set(TALLY_X, 0.004, 0);
  let side = 1;
  const facing = new THREE.Vector3();
  for (const [surface, [w, h]] of [[score, SCORE_SIZE], [tallies[SIDE_HOME], TALLY_SIZE], [tallies[SIDE_AWAY], TALLY_SIZE]]) {
    const { mesh } = surface;
    mesh.onBeforeRender = (renderer, scene, camera) => {
      side = nearTouchlineSign(camera.position.z, side);
      mesh.getWorldPosition(facing);
      const yaw = Math.atan2(camera.position.x - facing.x, camera.position.z - facing.z);
      // Turned to face the camera, the panel's reach across the pitch changes; keep it inside the touchline.
      const reach = (Math.abs(Math.sin(yaw)) * w + Math.abs(Math.cos(yaw)) * h) / 2;
      mesh.position.z = side * (PITCH_HALF_WIDTH - TOUCHLINE_CLEARANCE - reach);
      mesh.rotation.y = yaw;
      mesh.updateMatrixWorld();
    };
    root.add(mesh);
  }
  parent.add(root);

  const state = { scores: { home: 0, away: 0 }, flicks: { home: 0, away: 0 } };
  const redraw = () => {
    drawScore(score.ctx, state.scores, colours);
    score.texture.needsUpdate = true;
    for (const s of [SIDE_HOME, SIDE_AWAY]) {
      drawTallies(tallies[s].ctx, state.flicks[s], colours[s]);
      tallies[s].texture.needsUpdate = true;
    }
  };
  // Canvas text falls back to a system font until the chalk face has loaded.
  document.fonts?.load("700 64px 'Cabin Sketch'").then(redraw, () => {});

  return {
    root,
    setScore(scores) { state.scores = { ...scores }; redraw(); },
    setFlicks(home, away) { state.flicks = { home, away }; redraw(); },
    setVisible(visible) { root.visible = visible; },
  };
}
