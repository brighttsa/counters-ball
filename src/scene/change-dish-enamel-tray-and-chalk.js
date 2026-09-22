// Nima kiosk set piece at bottle-cap scale: the seller's enamel change dish,
// a curved white tin tray with a blue rim, standing on its edge around the
// goal mouth. A chalk arc on the table shows where it will cover NEXT. It
// turns only between turns, and shivers when the ball rattles it.
import * as THREE from 'three';
import { createCanvas, toTexture } from './environment/canvas-texture-helpers.js';
import { COVER_ANGLES, DISH_RADIUS, DISH_SPAN } from '../gameplay/change-dish-state.js';
import { GOAL_LINE_X } from '../core/pitch-dimensions-and-constants.js';

const TRAY_HEIGHT = 0.06; // tall enough to read on a phone, well under the crossbar

function enamelTexture() {
  const c = createCanvas(512, 64);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f1efe6'; ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = '#2f5d9a'; ctx.fillRect(0, 0, 512, 12);            // the blue rim every enamel dish has
  ctx.fillStyle = '#1d1b18';
  for (const [x, y, r] of [[60, 30, 4], [210, 44, 3], [330, 26, 5], [455, 40, 3]]) { // chipped enamel
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#b8452e'; ctx.fillRect(236, 20, 40, 24);          // a painted flower, half worn away
  return toTexture(c);
}

export function buildChangeDishes(parent, dishes) {
  const root = new THREE.Group();
  root.name = 'nima-change-dishes';
  const tray = new THREE.MeshStandardMaterial({ map: enamelTexture(), roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide });
  const chalk = new THREE.MeshBasicMaterial({ color: 0xf4f1e8, transparent: true, opacity: 0.6, depthWrite: false });
  const rigs = dishes.dishes.map((dish) => {
    const turn = new THREE.Group();
    turn.position.x = dish.sign * GOAL_LINE_X;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(DISH_RADIUS, DISH_RADIUS, TRAY_HEIGHT, 24, 1, true,
      -DISH_SPAN / 2, DISH_SPAN), tray);
    wall.position.y = TRAY_HEIGHT / 2 + 0.002;
    wall.castShadow = wall.receiveShadow = true;
    turn.add(wall);
    const ghost = new THREE.Mesh(new THREE.RingGeometry(DISH_RADIUS - 0.012, DISH_RADIUS + 0.012, 20, 1, -DISH_SPAN / 2, DISH_SPAN), chalk);
    ghost.rotation.x = -Math.PI / 2;
    ghost.position.set(dish.sign * GOAL_LINE_X, 0.003, 0);
    root.add(turn, ghost);
    return { dish, turn, wall, ghost, shown: COVER_ANGLES[dishes.state(dish)], shake: 0 };
  });
  parent.add(root);
  let time = 0;
  const target = (rig) => COVER_ANGLES[dishes.state(rig.dish)];

  return {
    root,
    /** True while a dish is still turning to its new notch. */
    get animating() { return rigs.some((rig) => Math.abs(rig.shown - target(rig)) > 0.01); },
    rattle(side, strength) {
      const rig = rigs.find((r) => r.dish.side === side);
      if (rig) rig.shake = Math.min(0.3, rig.shake + strength * 0.4);
    },
    update(dt) {
      time += dt;
      for (const rig of rigs) {
        const goal = target(rig);
        rig.shown += (goal - rig.shown) * (1 - Math.exp(-dt * 7));
        if (Math.abs(goal - rig.shown) < 0.002) rig.shown = goal;
        rig.shake *= Math.exp(-dt * 7);
        // Cylinder angle 0 points along local +z; turn it to face the covered arc's centre.
        rig.turn.rotation.y = Math.PI / 2 - dishes.worldAngle(rig.dish, rig.shown);
        rig.wall.position.y = TRAY_HEIGHT / 2 + 0.002 + Math.abs(Math.sin(time * 45)) * rig.shake * 0.01;
        // Flat ring angles run the other way round once laid on the table.
        rig.ghost.rotation.z = -dishes.worldAngle(rig.dish, COVER_ANGLES[dishes.state(rig.dish, 1)]);
      }
      chalk.opacity = 0.5 + Math.sin(time * 3) * 0.12;
    },
  };
}
