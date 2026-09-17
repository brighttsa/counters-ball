// The neighbourhood's other residents: chickens (and guinea fowl up north)
// wander well behind the table, stop to peck, look around, and scatter
// flapping when a goal goes in. Kept at a distance so depth of field turns
// them into soft, believable shapes rather than foreground props.
import * as THREE from 'three';
import { GROUND_Y, createCanvas, toTexture } from './canvas-texture-helpers.js';

const matte = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
const DEFAULT_ZONE = { minX: -7.5, maxX: 7.5, minZ: -6.8, maxZ: -4.0 }; // legs and bellies pass through the top of the frame

const PLUMAGE = {
  brown: { body: '#8a4b22', tail: '#2a1b10', neck: '#b86a2a', head: '#9a5226', legs: '#d9a53a' },
  white: { body: '#e9e3d6', tail: '#d4ccbc', neck: '#efe8da', head: '#ece5d6', legs: '#d9a53a' },
  black: { body: '#27221e', tail: '#141110', neck: '#8a5a22', head: '#2e2823', legs: '#6d6a60' },
  guineafowl: { body: '#474c55', tail: '#3a3e46', neck: '#2a2d33', head: '#e2e9f0', legs: '#5e636b', spotted: true },
};

function spottedTexture() {
  const c = createCanvas(128, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#474c55';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(240, 244, 248, 0.9)';
  for (let y = 4; y < 128; y += 9) for (let x = (y / 9) % 2 ? 4 : 8; x < 128; x += 9) {
    ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  return toTexture(c);
}

function buildBird(kind, variant) {
  const p = PLUMAGE[kind === 'guineafowl' ? 'guineafowl' : variant] ?? PLUMAGE.brown;
  const guinea = kind === 'guineafowl';
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const bodyMat = p.spotted ? new THREE.MeshStandardMaterial({ map: spottedTexture(), roughness: 0.85 }) : matte(p.body);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), bodyMat);
  body.scale.set(guinea ? 0.6 : 0.55, guinea ? 0.6 : 0.58, guinea ? 0.78 : 0.8);
  body.position.y = 1.25;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(guinea ? 0.35 : 0.45, guinea ? 0.5 : 0.95, 8), matte(p.tail));
  tail.position.set(0, guinea ? 1.35 : 1.62, -0.72);
  tail.rotation.x = guinea ? -2.2 : -0.6;
  bodyPivot.add(body, tail);

  const wings = [-1, 1].map((side) => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), bodyMat);
    wing.scale.set(0.12, 0.38, 0.55);
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.52, 1.4, -0.05);
    pivot.add(wing);
    wing.position.y = -0.2;
    bodyPivot.add(pivot);
    return pivot;
  });

  const neck = new THREE.Group(); // pivot at the base of the neck: dips to peck
  neck.position.set(0, 1.5, 0.55);
  const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.55, 10), matte(p.neck));
  throat.position.set(0, 0.2, 0.05);
  const head = new THREE.Mesh(new THREE.SphereGeometry(guinea ? 0.2 : 0.27, 12, 10), matte(p.head));
  head.position.set(0, 0.5, 0.14);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 6), matte('#d9b54a', 0.6));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.48, guinea ? 0.38 : 0.46);
  const crest = new THREE.Mesh(guinea ? new THREE.ConeGeometry(0.07, 0.2, 6) : new THREE.BoxGeometry(0.05, 0.2, 0.3),
    matte(guinea ? '#9a6a3a' : '#c8342a', 0.6));
  crest.position.set(0, guinea ? 0.72 : 0.78, 0.14);
  const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), matte('#c8342a', 0.6));
  wattle.position.set(0, 0.32, 0.36);
  neck.add(throat, head, beak, crest, wattle);
  bodyPivot.add(neck);

  const legs = [-1, 1].map((side) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6), matte(p.legs, 0.6));
    leg.geometry.translate(0, -0.375, 0);
    leg.position.set(side * 0.2, 0.78, 0.05);
    root.add(leg);
    return leg;
  });
  return { root, bodyPivot, neck, wings, legs };
}

const lerp = (a, b, t) => a + (b - a) * t;
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** @returns {{ object, update(t, dt), startle() }} */
export function buildFowl(kind, rng, { variant = 'brown', start = [0, -4.5], zone = {}, obstacles = [] } = {}) {
  const parts = buildBird(kind, variant);
  const z = { ...DEFAULT_ZONE, ...zone };
  const pos = new THREE.Vector2(...start);
  const target = new THREE.Vector2();
  const seed = rng() * 100;
  let state = 'idle', timer = rng() * 2, heading = rng() * Math.PI * 2, step = 0, dip = 0;

  const pickTarget = (farFromX = null) => {
    for (let tries = 0; tries < 8; tries++) {
      target.set(farFromX === null ? lerp(z.minX, z.maxX, rng()) : (farFromX < 0 ? z.maxX : z.minX), lerp(z.minZ, z.maxZ, rng()));
      if (!obstacles.some((o) => Math.hypot(target.x - o.x, target.y - o.z) < o.r + 0.6)) return;
    }
  };

  function update(t, dt) {
    if (dt <= 0) return;
    timer -= dt;
    const moving = state === 'walk' || state === 'flee';
    if (moving) {
      const dx = target.x - pos.x, dz = target.y - pos.y, dist = Math.hypot(dx, dz);
      if (dist < 0.2 || (state === 'flee' && timer < 0)) {
        state = rng() < 0.65 ? 'peck' : 'idle';
        timer = 1 + rng() * 2.2;
      } else {
        heading += wrapAngle(Math.atan2(dx, dz) - heading) * Math.min(1, dt * 6);
        const speed = state === 'flee' ? 3.4 : 0.9;
        pos.x += Math.sin(heading) * speed * dt;
        pos.y += Math.cos(heading) * speed * dt;
        step += dt * speed * 9;
        for (const o of obstacles) { // step around props rather than through them
          const ox = pos.x - o.x, oz = pos.y - o.z, d = Math.hypot(ox, oz), r = o.r + 0.5;
          if (d < r && d > 0) { pos.x = o.x + (ox / d) * r; pos.y = o.z + (oz / d) * r; }
        }
      }
    } else if (timer < 0) {
      pickTarget();
      state = 'walk';
    }

    const peckTarget = state === 'peck' ? Math.pow(Math.max(0, Math.sin(t * 9 + seed)), 2) * 1.15 : 0;
    dip = lerp(dip, peckTarget, Math.min(1, dt * 14));
    parts.neck.rotation.x = dip;
    parts.neck.rotation.y = state === 'idle' ? Math.sin(t * 1.7 + seed) * 0.7 : 0;
    parts.bodyPivot.position.y = moving ? Math.abs(Math.sin(step)) * 0.07 : 0;
    parts.legs[0].rotation.x = moving ? Math.sin(step) * 0.55 : 0;
    parts.legs[1].rotation.x = moving ? -Math.sin(step) * 0.55 : 0;
    const flap = state === 'flee' ? 0.5 + Math.sin(t * 38) * 0.7 : 0;
    parts.wings[0].rotation.z = -flap;
    parts.wings[1].rotation.z = flap;
    parts.root.position.set(pos.x, GROUND_Y, pos.y);
    parts.root.rotation.y = heading;
  }

  return {
    object: parts.root,
    update,
    startle() {
      state = 'flee';
      timer = 1.1 + rng() * 0.6;
      pickTarget(pos.x);
    },
  };
}
