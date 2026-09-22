import * as THREE from 'three';
import { TABLE_HALF_LENGTH as X, TABLE_HALF_WIDTH as Z } from '../core/pitch-dimensions-and-constants.js';

// All silhouette changes stay outside the standardized collision rectangle.
export function venueSurfaceOutline(construction) {
  const cuts = { slab: 0.22, counter: 0.06, stools: 0.12, trestles: 0.03, platform: 0.28, desk: 0 };
  const c = cuts[construction] ?? 0;
  const points = [[-X + c, -Z], [X - c, -Z], [X, -Z + c], [X, Z - c],
    [X - c, Z], [-X + c, Z], [-X, Z - c], [-X, -Z + c]];
  if (construction === 'counter') { points[0][1] -= 0.14; points[1][1] -= 0.14; }
  if (construction === 'trestles') { points[4][1] += 0.09; points[5][1] += 0.09; }
  return points;
}

export function venueSurfaceGeometry(construction, depth = 0) {
  const outline = venueSurfaceOutline(construction);
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geometry = depth > 0 ? new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 })
    : new THREE.ShapeGeometry(shape);
  if (!depth) {
    const positions = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) uv.setXY(i,
      (positions.getX(i) + X) / (2 * X), (positions.getY(i) + Z) / (2 * Z));
  }
  geometry.rotateX(-Math.PI / 2);
  if (depth) geometry.translate(0, -depth - 0.001, 0);
  return geometry;
}
