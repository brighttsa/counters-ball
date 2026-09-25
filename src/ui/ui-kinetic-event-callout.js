// A single presentation lane: lesser events cannot obscure a decisive moment.
export class KineticEventCallout {
  constructor(root) {
    this.root = root;
    this.word = root.querySelector('.goal-word');
    this.sub = root.querySelector('.goal-sub');
    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.clear();
  }

  event(label, { direction = 1, priority = 1, duration = 0.9, detail = '' } = {}) {
    if (this.active && priority < this.active.priority) return false;
    this.active = { priority, direction: direction < 0 ? -1 : 1,
      fromOpacity: this.active ? this.opacity : 0,
      fromOffset: this.active ? this.offset : (direction < 0 ? 32 : -32),
      // A replacement starts from wherever the current callout is, so an interruption never snaps.
      fromScale: this.active ? this.scale : 0.97, fromLift: this.active ? this.lift : 6,
      duration: Math.max(0.2, Number.isFinite(duration) ? duration : 0.9), elapsed: 0 };
    this.word.textContent = label;
    this.sub.textContent = detail;
    this.root.hidden = false;
    this.paint();
    return true;
  }

  update(dt) {
    if (!this.active || !Number.isFinite(dt) || dt <= 0) return;
    this.active.elapsed += dt;
    if (this.active.elapsed >= this.active.duration) this.clear();
    else this.paint();
  }

  paint() {
    const { elapsed, duration, direction, fromOpacity, fromOffset, fromScale, fromLift } = this.active;
    const enter = Math.min(1, elapsed / Math.min(0.14, duration / 3));
    const exit = Math.max(0, 1 - (duration - elapsed) / Math.min(0.16, duration / 3));
    this.offset = this.motion.matches ? 0 : fromOffset * (1 - enter) + direction * exit * 32;
    this.opacity = Math.min(fromOpacity + (1 - fromOpacity) * enter, 1 - exit);
    this.scale = this.motion.matches ? 1 : fromScale + (1 - fromScale) * enter;
    this.lift = this.motion.matches ? 0 : fromLift * (1 - enter);
    this.root.style.opacity = String(this.opacity);
    this.root.style.transform = `translateX(${this.offset}px) translateY(${this.lift}px) scale(${this.scale})`;
  }

  clear() {
    this.active = null;
    this.offset = 0;
    this.opacity = 0;
    this.scale = 1;
    this.lift = 0;
    this.root.hidden = true;
    this.word.textContent = '';
    this.sub.textContent = '';
  }
}
