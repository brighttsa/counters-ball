// Tamale Lorry Station set piece at bottle-cap scale: behind each goal a toy
// wooden "mammy wagon" lorry drives along the end of the table, and the goal
// rides in front of its side boards. A painted track with five stop ticks,
// a ghost goal at the NEXT stop and a chevron for the direction make the
// lorry's schedule readable before anyone flicks. Motion happens between turns.
import * as THREE from 'three';
import { createCanvas, toTexture } from './environment/canvas-texture-helpers.js';
import { SIGN_FONT, fitFont } from './environment/sign-board-lettering.js';
import { box, rod, material } from './venue-construction-primitives.js';
import { GOAL_LINE_X, GOAL_HALF_WIDTH } from '../core/pitch-dimensions-and-constants.js';
import { LORRY_STOPS } from '../gameplay/departing-lorry-goal-state.js';

const TRACK_X = GOAL_LINE_X + 0.06;
const LORRY_X = 1.9;
const WHEEL_R = 0.045;
const SLOGANS = { [-1]: 'SEA NEVER DRY', 1: 'BOLGA EXPRESS' };

function sloganTexture(text, base) {
  const c = createCanvas(512, 96);
  const ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#e2b93b'; ctx.fillRect(0, 0, 512, 10); ctx.fillRect(0, 86, 512, 10);
  ctx.fillStyle = '#fdf1d8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitFont(ctx, text, 470, 58, SIGN_FONT);
  ctx.fillText(text, 256, 50);
  return toTexture(c);
}

function flat(mesh, x, z) {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.003, z);
  return mesh;
}

function buildLorry(parent, sign) {
  const lorry = new THREE.Group();
  const facePitch = -sign; // the side boards face the pitch
  const body = sign < 0 ? '#2f6f9a' : '#b8452e';
  box(lorry, [0.24, 0.05, 0.62], [0, 0.085, 0], material('#6b4a2a'));                // bed
  const side = box(lorry, [0.012, 0.1, 0.6], [facePitch * 0.115, 0.16, 0], material(body));
  box(lorry, [0.012, 0.1, 0.6], [-facePitch * 0.115, 0.16, 0], material(body));
  box(lorry, [0.24, 0.1, 0.012], [0, 0.16, -0.3], material(body));
  box(lorry, [0.22, 0.16, 0.15], [0, 0.18, 0.37], material('#e0b13e'));              // cab
  box(lorry, [0.2, 0.06, 0.012], [0, 0.22, 0.447], material('#23303a', 0.2, 0.3));   // windscreen
  const slogan = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.09),
    new THREE.MeshStandardMaterial({ map: sloganTexture(SLOGANS[sign], body), roughness: 0.8 }));
  slogan.position.set(facePitch * 0.1225, 0.16, 0);
  slogan.rotation.y = facePitch * Math.PI / 2;
  lorry.add(slogan);
  const wheels = [];
  const tyre = material('#1d1b18'), hub = material('#9a968c', 0.5, 0.5);
  for (const wx of [-0.1, 0.1]) for (const wz of [-0.2, 0.34]) {
    const wheel = new THREE.Group();
    wheel.position.set(wx, WHEEL_R, wz);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.035, 16), tyre);
    t.rotation.z = Math.PI / 2;
    const h = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R * 0.45, WHEEL_R * 0.45, 0.037, 8), hub);
    h.rotation.z = Math.PI / 2;
    wheel.add(t, h);
    lorry.add(wheel);
    wheels.push(wheel);
  }
  lorry.position.x = sign * LORRY_X;
  lorry.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  side.name = 'lorry-side-boards';
  parent.add(lorry);
  return { lorry, wheels };
}

function buildTrack(parent, sign, paint) {
  parent.add(flat(new THREE.Mesh(new THREE.PlaneGeometry(0.016, LORRY_STOPS[4] * 2 + 0.3), paint), sign * TRACK_X, 0));
  for (const z of LORRY_STOPS) parent.add(flat(new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.014), paint), sign * TRACK_X, z));
}

function buildGhost(parent, sign) {
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xfdf6e6, transparent: true, opacity: 0.35, depthWrite: false });
  const ghost = new THREE.Group();
  for (const z of [-GOAL_HALF_WIDTH, GOAL_HALF_WIDTH]) rod(ghost, [0, 0, z], [0, 0.22, z], 0.011, ghostMat);
  rod(ghost, [0, 0.22, -GOAL_HALF_WIDTH], [0, 0.22, GOAL_HALF_WIDTH], 0.011, ghostMat);
  ghost.traverse((o) => { o.castShadow = false; });
  ghost.position.x = sign * GOAL_LINE_X;
  const chevronShape = new THREE.Shape([new THREE.Vector2(-0.04, -0.03), new THREE.Vector2(0.04, -0.03), new THREE.Vector2(0, 0.045)]);
  const chevron = flat(new THREE.Mesh(new THREE.ShapeGeometry(chevronShape), ghostMat), sign * TRACK_X, 0);
  parent.add(ghost, chevron);
  return { ghost, chevron, ghostMat };
}

export function buildDepartingLorries(parent, goalGroups, lorries) {
  const root = new THREE.Group();
  root.name = 'tamale-departing-lorries';
  const paint = new THREE.MeshBasicMaterial({ color: 0xe2b93b, transparent: true, opacity: 0.8 });
  const rigs = lorries.goals.map((goal) => {
    buildTrack(root, goal.sign, paint);
    return { goal, group: goalGroups[goal.sign], z: lorries.center(goal), ...buildLorry(root, goal.sign), ...buildGhost(root, goal.sign) };
  });
  parent.add(root);
  let time = 0;
  const sync = (rig) => { rig.group.position.z = rig.z; rig.lorry.position.z = rig.z; };
  rigs.forEach(sync);

  return {
    root,
    /** True while a lorry is still pulling up to its new stop. */
    get animating() { return rigs.some((rig) => Math.abs(rig.z - lorries.center(rig.goal)) > 0.004); },
    update(dt) {
      time += dt;
      for (const rig of rigs) {
        const target = lorries.center(rig.goal), next = lorries.center(rig.goal, 1);
        const before = rig.z;
        rig.z += (target - rig.z) * (1 - Math.exp(-dt * 6));
        if (Math.abs(target - rig.z) < 0.001) rig.z = target;
        sync(rig);
        for (const wheel of rig.wheels) wheel.rotation.x += (rig.z - before) / WHEEL_R;
        rig.ghost.position.z = next;
        rig.chevron.position.z = (target + next) / 2;
        rig.chevron.rotation.z = next > target ? Math.PI : 0; // shape tip is local +y, which lies along world −z
        rig.ghostMat.opacity = 0.28 + Math.sin(time * 4) * 0.1;
      }
    },
  };
}
