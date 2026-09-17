// The physical table: painted surface sheet, plywood board, crate stand and
// the wooden battens nailed around the rim that the caps bounce off.
import * as THREE from 'three';
import { paintTableSurfaceTextures } from './table-surface-texture-painters.js';
import {
  TABLE_HALF_LENGTH as TL, TABLE_HALF_WIDTH as TW,
  WALL_HALF_LENGTH as WL, WALL_HALF_WIDTH as WW,
} from '../core/pitch-dimensions-and-constants.js';

export function buildTableAndBattens(group, surface, seed) {
  const isWood = surface.kind === 'wood';
  const { colorCanvas, bumpCanvas } = paintTableSurfaceTextures(surface, seed);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);

  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(TL * 2, TW * 2),
    new THREE.MeshStandardMaterial({
      map, bumpMap,
      bumpScale: isWood ? 0.55 : 0.9,
      roughness: isWood ? 0.72 : 0.96, // varnished wood catches a little sheen
      metalness: 0,
    })
  );
  top.rotation.x = -Math.PI / 2;
  top.receiveShadow = true;
  group.add(top);

  // Board underneath + rough crate stand give the table real depth.
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(TL * 2 + 0.04, 0.06, TW * 2 + 0.04),
    new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.9 })
  );
  board.position.y = -0.032;
  board.castShadow = true;
  group.add(board);

  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.85, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x5f4326, roughness: 0.95 })
  );
  crate.position.y = -0.49;
  group.add(crate);

  const battenMat = new THREE.MeshStandardMaterial({
    color: isWood ? new THREE.Color(surface.dark) : new THREE.Color(0x9c7444),
    roughness: 0.85,
  });
  const battenH = 0.05, battenT = 0.045;
  for (const side of [-1, 1]) {
    const long = new THREE.Mesh(new THREE.BoxGeometry(WL * 2 + battenT * 2, battenH, battenT), battenMat);
    long.position.set(0, battenH / 2, side * (WW + battenT / 2));
    const short = new THREE.Mesh(new THREE.BoxGeometry(battenT, battenH, WW * 2), battenMat);
    short.position.set(side * (WL + battenT / 2), battenH / 2, 0);
    for (const batten of [long, short]) {
      batten.castShadow = true;
      batten.receiveShadow = true;
      group.add(batten);
    }
  }
  return top;
}
