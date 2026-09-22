// Magic's table under the Jamestown bulb, at bottle-cap scale: three coin
// stacks per side with chalk order dots (one, two, three), a lighthouse beam
// standing on the stack to strike next, and an iron bar with a brass padlock
// across each goal mouth. Lit stacks glow amber; when a chain completes the
// padlock drops and the bar goes. The view reads the chain state every frame,
// so it never needs to be told what changed.
import * as THREE from 'three';
import { material, rod } from './venue-construction-primitives.js';
import { STACK_RADIUS, LOCK_BAR_X } from '../gameplay/coin-stack-chain-state.js';
import { attackDirection, GOAL_HALF_WIDTH } from '../core/pitch-dimensions-and-constants.js';

const COINS_PER_STACK = 5;
const COIN_HEIGHT = 0.012;
const BEAM_HEIGHT = 1.3;
const LOCK_HANG = 0.037; // padlock centre height: hangs from the bar, clear of the table
const BEAM_COLOURS = { home: 0xcfe8ff, away: 0xffcf7a }; // sea-lighthouse white for you, Magic's gold

function buildStack(mats, seed) {
  const stack = new THREE.Group();
  const geometry = new THREE.CylinderGeometry(STACK_RADIUS * 0.92, STACK_RADIUS * 0.92, COIN_HEIGHT, 20);
  const coins = [];
  for (let i = 0; i < COINS_PER_STACK; i++) {
    const coin = new THREE.Mesh(geometry, mats.coin);
    const wobble = ((i * 7 + seed * 3) % 5) / 5 - 0.4; // a hand-stacked, slightly crooked pile
    coin.position.set(wobble * 0.006, COIN_HEIGHT * (i + 0.5), ((i * 3 + seed) % 4) * 0.002 - 0.003);
    coin.castShadow = coin.receiveShadow = true;
    stack.add(coin);
    coins.push(coin);
  }
  return { stack, coins };
}

function orderDots(root, mats, x, z, count, sign) {
  // Chalk dots on the side of the stack facing its owner's own goal: 1, 2 or 3.
  for (let i = 0; i < count; i++) {
    const dot = new THREE.Mesh(mats.dotGeometry, mats.chalk);
    dot.rotation.x = -Math.PI / 2;
    dot.position.set(x - sign * (STACK_RADIUS + 0.035), 0.003, z + (i - (count - 1) / 2) * 0.03);
    root.add(dot);
  }
}

function buildPadlock(root, mats, sign) {
  const group = new THREE.Group();
  rod(group, [sign * LOCK_BAR_X, 0.03, -GOAL_HALF_WIDTH], [sign * LOCK_BAR_X, 0.03, GOAL_HALF_WIDTH], 0.01, mats.iron);
  const lock = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, 0.04), mats.brass);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 14, Math.PI), mats.iron);
  shackle.rotation.y = Math.PI / 2;
  shackle.position.y = 0.022;
  lock.add(body, shackle);
  lock.scale.setScalar(1.6); // big enough to read on a phone from the far end
  lock.position.set(sign * LOCK_BAR_X, LOCK_HANG, 0);
  group.add(lock);
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  root.add(group);
  return { group, lock, drop: 0 };
}

function buildBeam(root, side) {
  const colour = BEAM_COLOURS[side];
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.1, BEAM_HEIGHT, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.12, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  cone.position.y = BEAM_HEIGHT / 2; // tip up at the lamp, open end on the table
  cone.rotation.x = Math.PI;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.12, 28),
    new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.35, depthWrite: false,
      blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.004;
  const beam = new THREE.Group();
  beam.add(cone, pool);
  root.add(beam);
  return { beam, cone, pool, placed: false };
}

export function buildCoinStackChains(parent, chains) {
  const root = new THREE.Group();
  root.name = 'jamestown-coin-stack-chain';
  const mats = {
    coin: material('#b9b4a6', 0.85, 0.35),
    lit: new THREE.MeshStandardMaterial({ color: '#f1c15a', metalness: 0.6, roughness: 0.3, emissive: '#ff9a2a', emissiveIntensity: 1.4 }),
    iron: material('#3b3a38', 0.7, 0.5),
    brass: material('#c79a3a', 0.8, 0.35),
    chalk: new THREE.MeshBasicMaterial({ color: 0xf4f1e8, transparent: true, opacity: 0.7, depthWrite: false }),
    dotGeometry: new THREE.CircleGeometry(0.009, 10),
  };
  const stacks = [];
  for (const side of ['home', 'away']) {
    const sign = attackDirection(side);
    chains.stacks[side].forEach((body, i) => {
      const { stack, coins } = buildStack(mats, i + (side === 'away' ? 4 : 1));
      stack.position.set(body.pos.x, 0.001, body.pos.y);
      root.add(stack);
      orderDots(root, mats, body.pos.x, body.pos.y, i + 1, sign);
      stacks.push({ side, index: i, coins, lit: false });
    });
  }
  const locks = { home: buildPadlock(root, mats, 1), away: buildPadlock(root, mats, -1) };
  const beams = { home: buildBeam(root, 'home'), away: buildBeam(root, 'away') };
  parent.add(root);
  let time = 0;

  return {
    root,
    animating: false, // nothing on this table moves between turns
    update(dt) {
      time += dt;
      for (const s of stacks) {
        const lit = s.index < chains.lit[s.side];
        if (lit !== s.lit) { s.lit = lit; for (const c of s.coins) c.material = lit ? mats.lit : mats.coin; }
      }
      for (const side of ['home', 'away']) {
        // The padlock drops and the bar goes once the chain is lit; both return when the bulb goes out.
        const l = locks[side], open = chains.bars[side].disabled;
        l.drop = open ? Math.min(1, l.drop + dt * 2.5) : 0;
        l.lock.position.y = LOCK_HANG * (1 - l.drop);
        l.lock.rotation.z = l.drop * 1.2;
        l.group.visible = l.drop < 1;
        // The beam glides to the next stack and breathes like a turning lighthouse lamp.
        const b = beams[side], next = chains.nextStack(side);
        b.beam.visible = Boolean(next);
        if (!next) continue;
        const k = b.placed ? 1 - Math.exp(-dt * 6) : 1;
        b.beam.position.x += (next.pos.x - b.beam.position.x) * k;
        b.beam.position.z += (next.pos.y - b.beam.position.z) * k;
        b.placed = true;
        const pulse = 0.75 + Math.sin(time * 2.4 + (side === 'home' ? 0 : 1.6)) * 0.25;
        b.cone.material.opacity = 0.12 * pulse;
        b.pool.material.opacity = 0.35 * pulse;
      }
    },
  };
}
