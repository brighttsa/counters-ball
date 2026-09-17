// Everyday things lying on the ground around a street game, modelled at true
// scale (1 unit ≈ 19 cm): rubber slippers, a school bag, an open exercise book,
// crushed water sachets, stray bottle caps, an enamel basin of oranges, a
// crate of capless bottles and a raffia mat. Each builder returns an Object3D
// whose origin sits on the ground.
import * as THREE from 'three';
import { createCanvas, toTexture } from './canvas-texture-helpers.js';

const matte = (color, roughness = 0.9, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

function slippers(rng, { color = '#2a2522', strap = '#15120f' } = {}) {
  const pair = new THREE.Group();
  const soleGeo = new THREE.CylinderGeometry(1, 1, 0.09, 24);
  const strapGeo = new THREE.TorusGeometry(0.21, 0.035, 6, 18, Math.PI);
  for (const side of [-1, 1]) {
    const slipper = new THREE.Group();
    const sole = new THREE.Mesh(soleGeo, matte(color, 0.8));
    sole.scale.set(0.28, 1, 0.66);
    sole.position.y = 0.045;
    const band = new THREE.Mesh(strapGeo, matte(strap, 0.7));
    band.position.set(0, 0.09, 0.14);
    slipper.add(sole, band);
    slipper.position.set(side * 0.34 + (rng() - 0.5) * 0.25, 0, (rng() - 0.5) * 0.4);
    slipper.rotation.y = (rng() - 0.5) * 0.8;
    pair.add(slipper);
  }
  return pair;
}

function schoolBag() {
  const bag = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 1.3), matte('#23324f', 0.85));
  body.position.y = 0.25;
  const flap = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.06, 0.72), matte('#1a2640', 0.85));
  flap.position.set(0, 0.52, 0.3);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.16), matte('#b9b8b0', 0.4, 0.8));
  buckle.position.set(0, 0.56, 0.62);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 20, Math.PI), matte('#1a2640'));
  strap.rotation.x = -Math.PI / 2;
  strap.position.set(0, 0.05, -0.65);
  bag.add(body, flap, buckle, strap);
  return bag;
}

function linedPageTexture(rng) {
  const c = createCanvas(128, 176);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f1ecdf';
  ctx.fillRect(0, 0, 128, 176);
  ctx.strokeStyle = 'rgba(80, 120, 190, 0.45)';
  for (let y = 22; y < 176; y += 10) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(200, 60, 60, 0.5)';
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(18, 176); ctx.stroke();
  ctx.strokeStyle = 'rgba(30, 40, 90, 0.55)'; // pencil homework scribbles
  for (let y = 30; y < 150; y += 10) {
    ctx.beginPath(); ctx.moveTo(24, y);
    for (let x = 24; x < 40 + rng() * 80; x += 6) ctx.lineTo(x, y - 2 - rng() * 4);
    ctx.stroke();
  }
  return toTexture(c);
}

function exerciseBook(rng) {
  const book = new THREE.Group();
  const pageMat = new THREE.MeshStandardMaterial({ map: linedPageTexture(rng), roughness: 0.95 });
  const cover = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.03, 1.5), matte('#3b6fb0'));
  cover.position.y = 0.015;
  book.add(cover);
  for (const side of [-1, 1]) {
    const page = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 1.44), pageMat);
    page.rotation.set(-Math.PI / 2, 0, 0);
    page.rotation.z = side * 0.06;
    page.position.set(side * 0.54, 0.05, 0);
    book.add(page);
  }
  return book;
}

function sachetTexture() {
  const c = createCanvas(128, 192);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(236, 242, 246, 0.6)';
  ctx.fillRect(0, 0, 128, 192);
  ctx.fillStyle = 'rgba(40, 110, 190, 0.8)';
  for (let y = 40; y < 170; y += 34) {
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= 128; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.12) * 6);
    ctx.lineTo(128, y + 10); ctx.lineTo(0, y + 10); ctx.fill();
  }
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('PURE', 64, 30);
  ctx.fillText('WATER', 64, 186);
  return toTexture(c);
}

function sachets(rng, { count = 3 } = {}) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ map: sachetTexture(), transparent: true, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < count; i++) {
    const geo = new THREE.PlaneGeometry(0.55, 0.85, 4, 6);
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) pos.setZ(v, (rng() - 0.3) * 0.06); // crumpled
    geo.computeVertexNormals();
    const sachet = new THREE.Mesh(geo, mat);
    sachet.rotation.set(-Math.PI / 2, 0, rng() * Math.PI * 2);
    sachet.position.set((rng() - 0.5) * 2.4, 0.03, (rng() - 0.5) * 1.6);
    group.add(sachet);
  }
  return group;
}

const CAP_COLORS = ['#a83b2a', '#2c6e4b', '#c99a2e', '#2f5d9a', '#e4dccb', '#262320', '#d0692a'];

function caps(rng, { count = 8 } = {}) {
  const group = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.085, 0.092, 0.024, 16);
  for (let i = 0; i < count; i++) {
    const cap = new THREE.Mesh(geo, matte(CAP_COLORS[Math.floor(rng() * CAP_COLORS.length)], 0.45, 0.55));
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * 1.6;
    cap.position.set(Math.cos(a) * d, 0.012, Math.sin(a) * d);
    cap.rotation.set((rng() - 0.5) * 0.3, rng() * 6, rng() > 0.8 ? Math.PI : (rng() - 0.5) * 0.3);
    group.add(cap);
  }
  return group;
}

function basinOranges(rng, { empty = false } = {}) {
  const basin = new THREE.Group();
  const profile = [[0, 0.02], [1.35, 0.02], [1.65, 0.42], [1.82, 0.6], [1.86, 0.64]].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 36),
    new THREE.MeshStandardMaterial({ color: '#e6e0d2', roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.84, 0.05, 8, 40), matte('#2f5d9a', 0.4));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.64;
  basin.add(bowl, rim);
  if (empty) return basin;
  const orangeGeo = new THREE.SphereGeometry(0.36, 16, 12);
  const spots = [[0, 0.4, 0], ...Array.from({ length: 6 }, (_, i) => [Math.cos(i) * 0.78, 0.38, Math.sin(i) * 0.78]),
    [0.35, 0.95, 0.1], [-0.3, 0.95, -0.15], [0.05, 0.95, 0.45]];
  for (const [x, y, z] of spots) {
    const orange = new THREE.Mesh(orangeGeo, matte(rng() > 0.8 ? '#b9a236' : '#e88a1e', 0.65));
    orange.position.set(x, y, z);
    orange.scale.setScalar(0.92 + rng() * 0.15);
    basin.add(orange);
  }
  return basin;
}

function bottleCrate(rng) {
  const crate = new THREE.Group();
  const red = matte('#b3302a', 0.6);
  const [w, d, h, t] = [2.2, 1.6, 1.35, 0.08];
  for (const [sx, sz, px, pz] of [[w, t, 0, d / 2], [w, t, 0, -d / 2], [t, d, w / 2, 0], [t, d, -w / 2, 0]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), red);
    wall.position.set(px, h / 2, pz);
    crate.add(wall);
  }
  const glass = new THREE.MeshStandardMaterial({ color: '#3d2a14', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 });
  const bodyGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.0, 12);
  const neckGeo = new THREE.CylinderGeometry(0.1, 0.2, 0.5, 12);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      if (rng() < 0.15) continue; // a few already taken
      const bottle = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, glass);
      body.position.y = 0.55;
      const neck = new THREE.Mesh(neckGeo, glass);
      neck.position.y = 1.3;
      bottle.add(body, neck);
      bottle.position.set(-0.8 + i * 0.53, 0, -0.5 + j * 0.5);
      crate.add(bottle);
    }
  }
  return crate;
}

function raffiaMat() {
  const c = createCanvas(256, 384);
  const ctx = c.getContext('2d');
  for (let y = 0; y < 384; y += 8) {
    ctx.fillStyle = y % 16 ? '#cfae6a' : '#b8944f';
    ctx.fillRect(0, y, 256, 8);
  }
  for (let x = 0; x < 256; x += 16) { ctx.fillStyle = 'rgba(90, 60, 20, 0.12)'; ctx.fillRect(x, 0, 3, 384); }
  for (const [y, col] of [[20, '#a83b2a'], [34, '#2c6e4b'], [340, '#2c6e4b'], [354, '#a83b2a']]) { ctx.fillStyle = col; ctx.fillRect(0, y, 256, 8); }
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 6.6), new THREE.MeshStandardMaterial({ map: toTexture(c), roughness: 1 }));
  mat.rotation.x = -Math.PI / 2;
  mat.position.y = 0.012;
  return mat;
}

export const EVERYDAY_PROP_BUILDERS = { slippers, schoolBag, exerciseBook, sachets, caps, basinOranges, bottleCrate, raffiaMat };
