// Stereo position of a table point as the player sees it. Panning follows the
// screen, not the table axes, so portrait (pitch running up the screen) and
// the free camera still put a left-side clink in the left ear.
import * as THREE from 'three';

const MAX_PAN = 0.6; // a nudge, not hard left/right: the whole table is in front of you
const scratch = new THREE.Vector3();

export function screenPan(camera, x, z) {
  if (!camera) return 0;
  scratch.set(x, 0, z).project(camera);
  if (!Number.isFinite(scratch.x) || scratch.z > 1) return 0; // behind the camera: keep it centred
  return Math.max(-MAX_PAN, Math.min(MAX_PAN, scratch.x * MAX_PAN));
}
