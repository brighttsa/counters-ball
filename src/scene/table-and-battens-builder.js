// Visual construction stays aligned with the unchanged physics plane and walls.
import * as THREE from 'three';
import { paintTableSurfaceTextures } from './table-surface-texture-painters.js';
import { buildVenueTableSupports } from './venue-table-supports.js';
import { buildVenueTableBoundaries } from './venue-table-boundaries.js';
import { venueSurfaceGeometry } from './venue-playing-surface-outline.js';
import {
  TABLE_HALF_LENGTH as TL, TABLE_HALF_WIDTH as TW,
  WALL_HALF_LENGTH as WL, WALL_HALF_WIDTH as WW,
} from '../core/pitch-dimensions-and-constants.js';

export function buildTableAndBattens(group, surface, seed, profile) {
  surface = profile?.surface ?? surface;
  const isWood = surface.kind === 'wood';
  const { colorCanvas, bumpCanvas, roughnessCanvas } = paintTableSurfaceTextures(surface, seed, profile);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);

  const top = new THREE.Mesh(
    profile ? venueSurfaceGeometry(profile.construction) : new THREE.PlaneGeometry(TL * 2, TW * 2),
    new THREE.MeshStandardMaterial({
      map, bumpMap, roughnessMap: roughnessCanvas ? new THREE.CanvasTexture(roughnessCanvas) : null,
      bumpScale: isWood ? 0.55 : 0.9,
      roughness: 1, // The map carries varnish, tape and dry wear independently.
      metalness: 0,
    })
  );
  if (!profile) top.rotation.x = -Math.PI / 2;
  top.receiveShadow = true;
  group.add(top);

  // Board underneath + rough crate stand give the table real depth.
  const board = new THREE.Mesh(
    profile ? venueSurfaceGeometry(profile.construction, profile.depth)
      : new THREE.BoxGeometry(TL * 2 + 0.04, 0.06, TW * 2 + 0.04),
    new THREE.MeshStandardMaterial({ color: profile?.surface.base ?? 0x8a6238, roughness: 0.9 })
  );
  board.position.y = profile ? 0 : -0.032;
  board.castShadow = true;
  group.add(board);

  if (profile) {
    buildVenueTableSupports(group, profile);
    buildVenueTableBoundaries(group, profile);
    return top;
  }

  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.85, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x5f4326, roughness: 0.95 })
  );
  crate.position.y = -0.49;
  crate.castShadow = true;
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
