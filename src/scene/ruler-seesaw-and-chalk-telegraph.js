// Adabraka Primary set piece at bottle-cap scale: a 30 cm school ruler standing
// on its edge, pinned through a pink-and-blue eraser. Chalk on the table shows
// the ruler's NEXT angle (a dashed ghost line) and which way it will turn
// (curved arrows at both ends). The ruler only turns between turns.
import * as THREE from 'three';
import { createCanvas, toTexture } from './environment/canvas-texture-helpers.js';
import { box, material } from './venue-construction-primitives.js';
import { RULER_HALF_LENGTH } from '../gameplay/ruler-seesaw-state.js';

const STEP = Math.PI / 4;
const RULER_HEIGHT = 0.055;

function rulerTexture() {
  const c = createCanvas(1024, 96);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d9b26a'; ctx.fillRect(0, 0, 1024, 96);
  ctx.fillStyle = 'rgba(120, 80, 30, 0.18)';
  for (let y = 6; y < 96; y += 11) ctx.fillRect(0, y, 1024, 2); // grain
  ctx.fillStyle = '#231a10';
  for (let cm = 0; cm <= 30; cm++) {
    const x = 12 + cm * 33.3;
    ctx.fillRect(x, 0, 3, cm % 5 === 0 ? 34 : 20);
    if (cm % 5 === 0 && cm) { ctx.font = 'bold 20px sans-serif'; ctx.fillText(String(cm), x - 8, 58); }
  }
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('30 cm · ADABRAKA PRIMARY', 360, 86);
  return toTexture(c);
}

function chalkDashTexture() {
  const c = createCanvas(256, 8);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f4f1e8';
  for (let x = 0; x < 256; x += 32) ctx.fillRect(x, 0, 20, 8);
  return toTexture(c);
}

function flat(mesh, y = 0.003) {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return mesh;
}

function buildOne(root, ruler, mats) {
  const pivot = new THREE.Group();
  pivot.position.x = ruler.x;
  const blade = box(pivot, [RULER_HALF_LENGTH * 2, RULER_HEIGHT, 0.024], [0, RULER_HEIGHT / 2 + 0.004, 0], mats.ruler);
  blade.castShadow = true;
  box(pivot, [0.07, 0.04, 0.05], [0, 0.02, 0], mats.eraser);        // pink end, pinned through the middle
  box(pivot, [0.035, 0.041, 0.051], [0.018, 0.02, 0], mats.eraserBlue);
  root.add(pivot);

  const telegraph = new THREE.Group();
  telegraph.position.x = ruler.x;
  const ghost = flat(new THREE.Mesh(new THREE.PlaneGeometry(RULER_HALF_LENGTH * 2, 0.014), mats.chalkDash));
  const ghostTurn = new THREE.Group();
  ghostTurn.add(ghost);
  const arcs = [0, Math.PI].map((phase) => {
    const arc = flat(new THREE.Mesh(new THREE.RingGeometry(RULER_HALF_LENGTH + 0.03, RULER_HALF_LENGTH + 0.042, 16, 1, 0, STEP), mats.chalk));
    const head = flat(new THREE.Mesh(new THREE.CircleGeometry(0.022, 3), mats.chalk));
    telegraph.add(arc, head);
    return { arc, head, phase };
  });
  telegraph.add(ghostTurn);
  root.add(telegraph);
  return { ruler, pivot, ghostTurn, arcs, shown: (ruler.step + ruler.offset) * STEP, wobble: 0 };
}

export function buildRulerSeesaws(parent, rulers) {
  const root = new THREE.Group();
  root.name = 'adabraka-ruler-seesaws';
  const chalk = new THREE.MeshBasicMaterial({ color: 0xf4f1e8, transparent: true, opacity: 0.7, depthWrite: false });
  const mats = {
    ruler: new THREE.MeshStandardMaterial({ map: rulerTexture(), roughness: 0.7 }),
    eraser: material('#e8878f', 0, 0.95), eraserBlue: material('#3f6fb5', 0, 0.95), chalk,
    chalkDash: new THREE.MeshBasicMaterial({ map: chalkDashTexture(), transparent: true, opacity: 0.7, depthWrite: false }),
  };
  const rigs = rulers.rulers.map((ruler) => buildOne(root, ruler, mats));
  parent.add(root);
  let time = 0;
  const target = (rig) => (rig.ruler.step + rig.ruler.offset) * STEP; // unbounded, so the turn never runs backwards

  return {
    root,
    /** True while a ruler is still turning to its new angle. */
    get animating() { return rigs.some((rig) => Math.abs(rig.shown - target(rig)) > 0.01); },
    shake(side, strength) {
      const rig = rigs.find((r) => r.ruler.side === side);
      if (rig) rig.wobble = Math.min(0.25, rig.wobble + strength * 0.3);
    },
    update(dt) {
      time += dt;
      for (const rig of rigs) {
        const goal = target(rig);
        rig.shown += (goal - rig.shown) * (1 - Math.exp(-dt * 7));
        if (Math.abs(goal - rig.shown) < 0.002) rig.shown = goal;
        rig.wobble *= Math.exp(-dt * 6);
        rig.pivot.rotation.set(0, -rig.shown, Math.sin(time * 40) * rig.wobble * 0.3);
        const next = goal + STEP;
        rig.ghostTurn.rotation.y = -next;
        for (const { arc, head, phase } of rig.arcs) {
          // Ring angles run the other way round from ours once laid flat (local +y is world −z).
          arc.rotation.z = -(next + phase);
          const r = RULER_HALF_LENGTH + 0.036, a = next + phase;
          head.position.set(Math.cos(a) * r, 0.004, Math.sin(a) * r);
          head.rotation.z = -a - Math.PI / 2;
        }
        chalk.opacity = 0.55 + Math.sin(time * 3) * 0.12;
      }
    },
  };
}
