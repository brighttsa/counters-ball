// Props that belong to a particular kind of place: a snake plant in a painted
// tin on the veranda, an old car tyre at the roadside, a yellow jerrycan and
// jute grain sacks at the lorry station, a fishing net pile and a charcoal
// coal pot in Jamestown, and an open concrete gutter along the road.
import * as THREE from 'three';
import { createCanvas, toTexture } from './canvas-texture-helpers.js';
import { GROUND_ZONE } from './ground-zone-mapping.js';

const matte = (color, roughness = 0.9, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

function pottedPlant(rng) {
  const plant = new THREE.Group();
  const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 1.15, 18), matte('#3f7a5a', 0.7, 0.3));
  tin.position.y = 0.575;
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.5, 18), matte('#3a2414'));
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 1.1;
  plant.add(tin, soil);
  const leafMat = matte('#4f7d3a', 0.6);
  for (let i = 0; i < 8; i++) { // sansevieria blades
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.7 + rng() * 0.6, 0.04), leafMat);
    blade.geometry.translate(0, 0.9, 0);
    blade.position.set((rng() - 0.5) * 0.4, 1.1, (rng() - 0.5) * 0.4);
    blade.rotation.set((rng() - 0.5) * 0.4, rng() * Math.PI, (rng() - 0.5) * 0.4);
    plant.add(blade);
  }
  return plant;
}

function oldTyre(rng) {
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.5, 14, 32), matte('#1e1c1b', 0.95));
  tyre.rotation.set(Math.PI / 2 + (rng() - 0.5) * 0.12, 0, 0);
  tyre.position.y = 0.46;
  const group = new THREE.Group();
  group.add(tyre);
  return group;
}

function jerrycan() {
  const can = new THREE.Group();
  const yellow = matte('#d9ad2c', 0.55);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.85, 0.72), yellow);
  body.position.y = 0.925;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 6, 14, Math.PI), yellow);
  handle.position.set(-0.2, 1.85, 0);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.18, 12), matte('#2f5d9a', 0.5));
  cap.position.set(0.35, 1.94, 0);
  const grime = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.45, 0.74), matte('#8a6a2a', 0.9));
  grime.position.y = 0.2;
  can.add(body, handle, cap, grime);
  return can;
}

function juteTexture() {
  const c = createCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#a8875a';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 4) {
    ctx.fillStyle = 'rgba(60, 40, 20, 0.18)'; ctx.fillRect(i, 0, 2, 256);
    ctx.fillStyle = 'rgba(230, 200, 150, 0.12)'; ctx.fillRect(0, i, 256, 2);
  }
  ctx.fillStyle = 'rgba(160, 40, 30, 0.55)';
  ctx.font = 'bold 30px Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MAIZE', 128, 120);
  ctx.fillText('50 KG', 128, 156);
  return toTexture(c);
}

function grainSack() {
  const geo = new THREE.SphereGeometry(1, 22, 16);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < -0.55) pos.setY(i, -0.55); // settled flat base
  geo.computeVertexNormals();
  const sack = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: juteTexture(), roughness: 1 }));
  sack.scale.set(1.25, 0.95, 0.95);
  sack.position.y = 0.52;
  const tie = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 10), matte('#8a6a40'));
  tie.position.set(1.15, 0.6, 0);
  tie.rotation.z = -Math.PI / 2;
  const group = new THREE.Group();
  group.add(sack, tie);
  return group;
}

function fishingNet(rng) {
  const c = createCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1f4a3a';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(120, 190, 150, 0.5)';
  ctx.lineWidth = 2;
  for (let i = -256; i < 512; i += 14) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, 256); ctx.lineTo(i + 256, 0); ctx.stroke();
  }
  const geo = new THREE.IcosahedronGeometry(1.4, 3);
  const pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).multiplyScalar(0.8 + rng() * 0.4);
    pos.setXYZ(i, v.x, Math.max(v.y, -0.2), v.z);
  }
  geo.computeVertexNormals();
  const tex = toTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  const pile = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  pile.scale.set(1.2, 0.42, 1);
  pile.position.y = 0.08;
  const group = new THREE.Group();
  group.add(pile);
  const floatGeo = new THREE.SphereGeometry(0.17, 10, 8);
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2, d = 0.5 + rng() * 0.9;
    const float = new THREE.Mesh(floatGeo, matte(i % 3 ? '#e8641f' : '#ece6d8', 0.5));
    float.position.set(Math.cos(a) * d * 1.2, 0.35 + rng() * 0.2, Math.sin(a) * d);
    group.add(float);
  }
  return group;
}

function coalPot(rng, { lit = false } = {}) {
  const pot = new THREE.Group();
  const iron = matte('#2b2825', 0.6, 0.5);
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(
    [[0.2, 0], [0.75, 0.25], [0.95, 0.6], [1.0, 0.65]].map(([x, y]) => new THREE.Vector2(x, y)), 20),
    new THREE.MeshStandardMaterial({ color: '#2b2825', roughness: 0.6, metalness: 0.5, side: THREE.DoubleSide }));
  bowl.position.y = 0.6;
  pot.add(bowl);
  for (let i = 0; i < 3; i++) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.1), iron);
    leg.position.set(Math.cos((i / 3) * Math.PI * 2) * 0.55, 0.32, Math.sin((i / 3) * Math.PI * 2) * 0.55);
    pot.add(leg);
  }
  const coalMat = new THREE.MeshStandardMaterial({
    color: '#1a1614', roughness: 0.9, emissive: lit ? new THREE.Color('#ff5a1a') : new THREE.Color(0), emissiveIntensity: lit ? 1.4 : 0,
  });
  const coalGeo = new THREE.IcosahedronGeometry(0.14, 0);
  for (let i = 0; i < 12; i++) {
    const coal = new THREE.Mesh(coalGeo, coalMat);
    coal.position.set((rng() - 0.5) * 0.9, 1.08 + rng() * 0.12, (rng() - 0.5) * 0.9);
    pot.add(coal);
  }
  if (lit) {
    pot.userData.update = (t) => { coalMat.emissiveIntensity = 1.2 + Math.sin(t * 5.3) * 0.25 + Math.sin(t * 13.1) * 0.15; };
  }
  return pot;
}

function gutter(rng) {
  const channel = new THREE.Group();
  const width = GROUND_ZONE.maxX - GROUND_ZONE.minX;
  const concrete = matte('#8e877c', 0.95);
  for (const side of [-0.5, 0.5]) {
    const lip = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, 0.2), concrete);
    lip.position.set(0, 0.06, side);
    channel.add(lip);
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.85),
    new THREE.MeshStandardMaterial({ color: '#2b2a24', roughness: 0.12, metalness: 0.25 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.04;
  channel.add(water);
  for (let x = -width / 2 + 1; x < width / 2; x += 2.6 + rng() * 1.8) { // loose cover slabs
    if (rng() < 0.3) continue;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 1.3), concrete);
    slab.position.set(x, 0.24, (rng() - 0.5) * 0.12);
    slab.rotation.y = (rng() - 0.5) * 0.12;
    channel.add(slab);
  }
  return channel;
}

export const VENUE_PROP_BUILDERS = { pottedPlant, oldTyre, jerrycan, grainSack, fishingNet, coalPot, gutter };
