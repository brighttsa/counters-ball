import * as THREE from 'three';

// On-screen shaft width at the cap, in CSS pixels. Power reads as width as well
// as length; touch screens get a bolder ribbon because a thumb covers the cap.
export const flickWidthPixels = (power, coarse = false) => (coarse ? 24 + 28 * power : 18 + 24 * power);

export function projectedFlickWidth(camera, canvas, origin, direction, power, coarse = false) {
  const rect = canvas?.getBoundingClientRect?.();
  const pixels = flickWidthPixels(power, coarse);
  if (!camera || !rect?.width || !rect?.height) return 0.11 + power * 0.08;
  camera.updateMatrixWorld();
  const center = new THREE.Vector3(origin.x, 0.035, origin.y);
  const perpendicular = new THREE.Vector3(-direction.y, 0, direction.x);
  const projected = width => {
    const a = center.clone().addScaledVector(perpendicular, width / 2).project(camera);
    const b = center.clone().addScaledVector(perpendicular, -width / 2).project(camera);
    return Math.hypot((a.x - b.x) * rect.width / 2, (a.y - b.y) * rect.height / 2);
  };
  // Solve actual perspective projection, including portrait camera rotation.
  let low = 0, high = 2;
  for (let i = 0; i < 24; i++) {
    const middle = (low + high) / 2;
    if (projected(middle) < pixels) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}
