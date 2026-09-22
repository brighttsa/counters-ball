// The Tema Motorway Junction toll plazas, built at bottle-cap scale on the
// table: concrete booth islands with little cabins, striped kerbs against the
// rails, red-and-white booms on hinges, and a signal lamp per lane that also
// throws a coloured pool onto the table so the state reads on a phone.
//   GREEN  lane open              AMBER (blinking)  open now, closes on the attacker's next turn
//   RED    boom down              GREEN + wobble    boom jammed open by the ball resting under it
// Behind the table stands the toll canopy itself, so the set piece belongs to
// the place rather than being scattered decoration.
import * as THREE from 'three';
import { createCanvas, toTexture, GROUND_Y } from './environment/canvas-texture-helpers.js';
import { SIGN_FONT, fitFont } from './environment/sign-board-lettering.js';
import { box, material } from './venue-construction-primitives.js';
import { mergeStaticMeshesByMaterial } from './static-mesh-merge-by-material.js';
import { LANES, BOOTH_Z, BOOTH_RADIUS, KERB_INNER_Z } from '../gameplay/toll-gate-lane-signal-state.js';

const LAMP = { open: 0x39e07a, closing: 0xffb321, closed: 0xe0402f };
const ANGLE = { open: 1.38, jammed: 0.55, closed: 0 };
const BOOM_Y = 0.052;

function stripeTexture(a, b, stripes = 8) {
  const c = createCanvas(128, 16);
  const ctx = c.getContext('2d');
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? b : a;
    ctx.fillRect((i * 128) / stripes, 0, 128 / stripes + 1, 16);
  }
  const texture = toTexture(c);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function canopySign() {
  const c = createCanvas(1024, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1f5a3a';
  ctx.fillRect(0, 0, 1024, 128);
  ctx.strokeStyle = '#f2ead6';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 1004, 108);
  ctx.fillStyle = '#f2ead6';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, 'TEMA MOTORWAY · TOLL PLAZA · STOP · PAY · GO', 960, 64, SIGN_FONT);
  ctx.fillText('TEMA MOTORWAY · TOLL PLAZA · STOP · PAY · GO', 512, 68);
  return toTexture(c);
}

function flatDisc(radius, color) {
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }));
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function buildPlaza(root, plaza, mats) {
  const group = new THREE.Group();
  group.position.x = plaza.x;
  root.add(group);
  const toward = -Math.sign(plaza.x); // the attacker approaches from midfield
  for (const z of [-BOOTH_Z, BOOTH_Z]) {
    const island = new THREE.Mesh(new THREE.CylinderGeometry(BOOTH_RADIUS, BOOTH_RADIUS * 1.04, 0.022, 24), mats.kerb);
    island.position.set(0, 0.011, z);
    group.add(island);
    box(group, [0.07, 0.085, 0.06], [0, 0.064, z], mats.cabin);
    box(group, [0.072, 0.03, 0.062], [0, 0.07, z], mats.glass);
    box(group, [0.11, 0.012, 0.1], [0, 0.113, z], mats.roof);
  }
  for (const sign of [-1, 1]) {
    const len = 1.12 - KERB_INNER_Z;
    const kerb = box(group, [0.1, 0.028, len], [0, 0.014, sign * (KERB_INNER_Z + len / 2)], mats.kerbBox);
    kerb.material.map.repeat.set(1, 1);
  }
  // Stop line: where the attacker "pays the toll".
  const stop = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 2.18), mats.paint);
  stop.rotation.x = -Math.PI / 2;
  stop.position.set(toward * 0.19, 0.0025, 0);
  group.add(stop);

  return LANES.map((lane, index) => {
    const hingeZ = index === 2 ? lane.z0 : lane.z1;        // every boom hinges on a booth
    const reach = index === 2 ? 1 : -1;
    const length = lane.z1 - lane.z0;
    const pivot = new THREE.Group();
    pivot.userData.moving = true;
    pivot.position.set(0, BOOM_Y, hingeZ);
    group.add(pivot);
    box(pivot, [0.016, 0.016, length], [0, 0, reach * length / 2], mats.boom);
    box(pivot, [0.03, 0.026, 0.035], [0, 0, -reach * 0.02], mats.counterweight);
    box(group, [0.014, BOOM_Y, 0.014], [toward * 0.02, BOOM_Y / 2, hingeZ], mats.post);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.027, 16, 12), new THREE.MeshBasicMaterial({ color: LAMP.closed, toneMapped: false }));
    lamp.position.set(toward * 0.02, BOOM_Y + 0.105, hingeZ);
    lamp.userData.moving = true; // recoloured per lane, so never merged
    box(group, [0.008, 0.1, 0.008], [toward * 0.02, BOOM_Y + 0.05, hingeZ], mats.post);
    group.add(lamp);
    const pool = flatDisc(Math.min(0.1, length * 0.34), LAMP.closed);
    pool.position.set(toward * 0.115, 0.004, lane.center);
    pool.userData.moving = true;
    group.add(pool);
    return { pivot, reach, lamp, pool, angle: 0, wobble: 0 };
  });
}

function buildCanopy(root, mats) {
  const canopy = new THREE.Group();
  canopy.position.set(0, 0, -2.45);
  for (const x of [-2.4, 0, 2.4]) box(canopy, [0.18, 2.35, 0.18], [x, GROUND_Y + 1.175, 0], mats.concrete);
  box(canopy, [5.6, 0.16, 1.1], [0, GROUND_Y + 2.43, 0.25], mats.concrete);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.52), new THREE.MeshStandardMaterial({ map: canopySign(), roughness: 0.7 }));
  sign.position.set(0, GROUND_Y + 2.05, 0.81);
  canopy.add(sign);
  root.add(canopy);
}

export function buildTollPlaza(parent, gates) {
  const root = new THREE.Group();
  root.name = 'tema-toll-plaza';
  const mats = {
    kerb: new THREE.MeshStandardMaterial({ map: stripeTexture('#e2b93b', '#1d1b18', 10), roughness: 0.8 }),
    kerbBox: new THREE.MeshStandardMaterial({ map: stripeTexture('#e2b93b', '#1d1b18', 6), roughness: 0.8 }),
    cabin: material(0xe9e1cf), glass: material(0x2b3a44, 0.2, 0.25), roof: material(0x2f5d9a),
    boom: new THREE.MeshStandardMaterial({ map: stripeTexture('#f2ead6', '#c3322a', 10), roughness: 0.55 }),
    counterweight: material(0x3a3631, 0.4, 0.6), post: material(0x5f625f, 0.5, 0.5),
    concrete: material(0xb9b2a4), paint: new THREE.MeshBasicMaterial({ color: 0xe8c24a, transparent: true, opacity: 0.85 }),
  };
  mats.boom.map.repeat.set(1, 1);
  const lanesByPlaza = new Map(gates.plazas.map((plaza) => [plaza, buildPlaza(root, plaza, mats)]));
  buildCanopy(root, mats);
  root.traverse((o) => { if (o.isMesh && o.material?.isMeshStandardMaterial) { o.castShadow = true; o.receiveShadow = true; } });
  // Booths, kerbs, posts, stop lines and canopy never move: one draw call per material.
  mergeStaticMeshesByMaterial(root, (o) => o.userData.moving || o.parent?.userData.moving);
  parent.add(root);

  let time = 0;
  return {
    root,
    /** True while any boom is still swinging to its new position. */
    get animating() {
      for (const [plaza, lanes] of lanesByPlaza) {
        if (lanes.some((l, i) => Math.abs(l.angle - ANGLE[stateOf(plaza, i)]) > 0.03)) return true;
      }
      return false;
    },
    shake(plazaSide, lane, strength) {
      const plaza = gates.plazaDefendedBy(plazaSide);
      const entry = lanesByPlaza.get(plaza)?.[lane];
      if (entry) entry.wobble = Math.min(0.35, entry.wobble + strength * 0.4);
    },
    update(dt) {
      time += dt;
      const blinkOn = Math.sin(time * 7) > -0.2;
      for (const [plaza, lanes] of lanesByPlaza) {
        lanes.forEach((entry, i) => {
          const state = stateOf(plaza, i);
          const target = ANGLE[state];
          entry.angle += (target - entry.angle) * (1 - Math.exp(-dt * 9));
          entry.wobble *= Math.exp(-dt * 5);
          const jitter = state === 'jammed' ? Math.sin(time * 23) * 0.04 : 0;
          entry.pivot.rotation.x = -entry.reach * (entry.angle + jitter + Math.sin(time * 30) * entry.wobble);
          const closing = state === 'open' && i === gates.closedLane(plaza, 1);
          const color = state === 'closed' ? LAMP.closed : closing ? LAMP.closing : LAMP.open;
          const lit = !(closing && !blinkOn);
          entry.lamp.material.color.setHex(lit ? color : 0x3a2a12);
          entry.pool.material.color.setHex(color);
          entry.pool.material.opacity = lit ? (state === 'closed' ? 0.5 : 0.75) : 0.2;
        });
      }
    },
  };

  function stateOf(plaza, lane) {
    if (lane !== gates.closedLane(plaza)) return 'open';
    return plaza.jammed.has(lane) ? 'jammed' : 'closed';
  }
}
