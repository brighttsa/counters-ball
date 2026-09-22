import * as THREE from 'three';
import { box, material } from './venue-construction-primitives.js';
import { createCanvas, toTexture, GROUND_Y } from './environment/canvas-texture-helpers.js';
import { createSeededRandom } from '../core/seeded-random-number-generator.js';
import { mergeStaticMeshesByMaterial } from './static-mesh-merge-by-material.js';

function sign(root, text, x, y, z, width, color = '#ead047') {
  const canvas = createCanvas(512, 128), ctx = canvas.getContext('2d');
  ctx.fillStyle = '#152321'; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = color; ctx.font = 'bold 52px Impact, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66, 470);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4),
    new THREE.MeshBasicMaterial({ map: toTexture(canvas), side: THREE.DoubleSide }));
  mesh.position.set(x, y, z); root.add(mesh);
}

export function buildRoadsideInkArchitecture(parent) {
  const root = new THREE.Group(); root.name = 'ink-tema-roadside';
  const ink = material(0x172725), concrete = material(0xadb7af), yellow = material(0xe5c446);
  const teal = material(0x376b66), rust = material(0xa7513b), glass = material(0x152c32);
  const rng = createSeededRandom(4201988);
  // An occupied verge: booth windows, repaired kerbs and drainage behind the table.
  for (const [x, z, paint] of [[-3.6, -3.3, teal], [3.7, -3.5, rust]]) {
    box(root, [1.4, 2.4, 1.3], [x, GROUND_Y + 1.2, z], paint);
    box(root, [1.22, .72, .04], [x, GROUND_Y + 1.6, z + .67], glass);
    box(root, [.055, .75, .05], [x, GROUND_Y + 1.6, z + .71], concrete);
    box(root, [1.65, .14, 1.55], [x, GROUND_Y + 2.48, z], ink);
    box(root, [1.45, .08, .32], [x, GROUND_Y + 1.18, z + .78], concrete);
    sign(root, x < 0 ? 'EXACT CHANGE' : 'TEMA / ACCRA', x, GROUND_Y + .72, z + .68, 1.2);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const z = -4.8 + i * .58;
      box(root, [.28, .16, .55], [side * 2.65, GROUND_Y + .08, z], i % 2 ? ink : yellow);
      box(root, [.32, .04, .09], [side * 2.97, GROUND_Y + .03, z], concrete);
    }
    box(root, [.065, 3.1, .065], [side * 3.1, GROUND_Y + 1.55, -4.8], ink);
    box(root, [.8, .06, .055], [side * 2.75, GROUND_Y + 3.1, -4.8], ink);
    box(root, [.32, .06, .15], [side * 2.4, GROUND_Y + 3.06, -4.8], yellow);
  }
  // Painted repair marks on the service lane, kept entirely outside the playing field.
  for (let i = 0; i < 15; i++) {
    box(root, [.35 + rng() * .5, .006, .04], [(rng() - .5) * 5, GROUND_Y + .012, -4 - rng() * 2], concrete);
  }
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  mergeStaticMeshesByMaterial(root);
  parent.add(root);
  return root;
}
