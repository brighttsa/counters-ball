// Fixed-capacity transform history. Playback touches meshes, never the simulation.
export class CompactTransformReplay {
  constructor(objects, seconds = 3, fps = 30) {
    this.objects = objects;
    this.capacity = Math.ceil(seconds * fps);
    this.step = 1 / fps;
    this.seconds = seconds;
    this.times = new Float64Array(this.capacity);
    this.stride = objects.length * 10;
    this.data = new Float32Array(this.capacity * this.stride);
    this.saved = new Float32Array(this.stride);
    this.reset();
  }
  reset() { this.count = 0; this.head = 0; this.clock = 0; this.time = 0; this.active = false; }
  write(target, offset) {
    for (const o of this.objects) {
      o.position.toArray(target, offset);
      o.quaternion.toArray(target, offset + 3);
      o.scale.toArray(target, offset + 7);
      offset += 10;
    }
  }
  apply(source, offset) {
    for (const o of this.objects) {
      o.position.fromArray(source, offset);
      o.quaternion.fromArray(source, offset + 3);
      o.scale.fromArray(source, offset + 7);
      offset += 10;
    }
  }
  capture(dt, force = false) {
    if (this.active) return;
    this.time += dt;
    this.clock += dt;
    if (!force && this.count && this.clock + 1e-9 < this.step) return;
    this.clock = Math.max(0, this.clock - Math.floor((this.clock + 1e-9) / this.step) * this.step);
    this.write(this.data, this.head * this.stride);
    this.times[this.head] = this.time;
    this.head = (this.head + 1) % this.capacity;
    this.count = Math.min(this.capacity, this.count + 1);
    while (this.count > 1 && this.time - this.times[this.oldest()] > this.seconds + 1e-9) this.count--;
  }
  oldest() { return (this.head - this.count + this.capacity) % this.capacity; }
  start() {
    if (this.count < 6 || this.active) return false;
    this.write(this.saved, 0);
    this.elapsed = 0;
    this.historyDuration = this.time - this.times[this.oldest()];
    this.duration = Math.max(2, Math.min(4, this.historyDuration / 0.8 + 0.12));
    this.playbackDuration = this.duration - 0.12;
    this.active = true;
    return true;
  }
  update(dt) {
    if (!this.active) return;
    this.elapsed += dt;
    if (this.elapsed >= this.duration) { this.stop(); return; }
    const oldest = this.oldest();
    // Hold the decisive final frame briefly before restoring the live scene.
    const target = this.times[oldest] + Math.min(1, this.elapsed / this.playbackDuration) * this.historyDuration;
    let frame = 0;
    while (frame + 1 < this.count && this.times[(oldest + frame + 1) % this.capacity] <= target + 1e-9) frame++;
    this.apply(this.data, ((oldest + frame) % this.capacity) * this.stride);
  }
  stop() {
    if (this.active) this.apply(this.saved, 0);
    this.active = false;
  }
}
