// Ambiguous touch halos must not turn a near miss into a shot with the wrong cap.
export function chooseTouchCap(candidates, radius = 28, separation = 6) {
  const nearby = candidates.filter(c => c.distance <= radius).sort((a, b) => a.distance - b.distance);
  if (!nearby.length) return { entry: null, ambiguous: false };
  if (nearby[1] && nearby[1].distance - nearby[0].distance < separation) {
    return { entry: null, ambiguous: true };
  }
  return { entry: nearby[0].entry, ambiguous: false };
}
