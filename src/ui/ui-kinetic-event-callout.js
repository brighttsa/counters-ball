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
    const { elapsed, duration, direction } = this.active;
    const enter = Math.min(1, elapsed / Math.min(0.14, duration / 3));
    const exit = Math.max(0, 1 - (duration - elapsed) / Math.min(0.16, duration / 3));
    const offset = this.motion.matches ? 0 : direction * ((1 - enter) * -32 + exit * 32);
    this.root.style.opacity = this.motion.matches ? '1' : String(Math.min(enter, 1 - exit));
    this.root.style.transform = `translateX(${offset}px)`;
    this.root.style.clipPath = this.motion.matches ? 'none' : `inset(0 ${exit * 100}% 0 0)`;
  }

  clear() {
    this.active = null;
    this.root.hidden = true;
    this.word.textContent = '';
    this.sub.textContent = '';
  }
}
