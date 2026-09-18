// A small recent-sample window makes draw speed independent of pointer event rate.
export class FlickGestureSampler {
  constructor() { this.samples = []; }
  reset(x, y, time) { this.samples = [{ x, y, time }]; }
  add(x, y, time) {
    if (!Number.isFinite(time)) return;
    this.samples.push({ x, y, time });
    while (this.samples.length > 2 && (time - this.samples[0].time > 90 || this.samples.length > 16)) this.samples.shift();
  }
  measure(pull) {
    const first = this.samples[0], last = this.samples.at(-1);
    if (!first || !last) return { stability: 1, speed: 0, boost: 1 };
    const dt = (last.time - first.time) / 1000;
    const dx = last.x - first.x, dy = last.y - first.y;
    const distance = Math.hypot(dx, dy), length = Math.hypot(pull.x, pull.y);
    const stability = distance < 0.008 || length === 0 ? 1 : Math.abs((dx * pull.x + dy * pull.y) / (distance * length));
    const speed = dt > 0.008 ? Math.min(4, distance / dt) : 0;
    const drawing = dx * pull.x + dy * pull.y < 0;
    return { stability, speed, boost: drawing && stability > 0.9 ? 1 + Math.min(0.08, speed * 0.02) : 1 };
  }
}
