const START_SPEED = 0.42;
const STOP_SPEED = 0.06;
const MIN_GRAIN_GAP = 0.11;
const MAX_GRAIN_GAP = 0.3;

const clamp01 = (value) => Math.max(0, Math.min(1, value));

export class VelocityDrivenCapMovementAudio {
  constructor({ onSlide, onSettle } = {}) {
    this.onSlide = onSlide;
    this.onSettle = onSettle;
    this.states = new WeakMap();
  }

  update(bodies, dt, panFor = () => 0) {
    for (const body of bodies) {
      if (body.kind !== 'cap' || body.invMass === 0) continue;
      const speed = Math.hypot(body.vel.x, body.vel.y);
      const state = this.states.get(body) ?? { moving: false, cooldown: 0 };
      state.cooldown = Math.max(0, state.cooldown - dt);
      if (speed >= START_SPEED) {
        state.moving = true;
        if (state.cooldown === 0) {
          const strength = clamp01((speed - START_SPEED) / 4.4);
          this.onSlide?.(strength, panFor(body), speed);
          state.cooldown = MAX_GRAIN_GAP - strength * (MAX_GRAIN_GAP - MIN_GRAIN_GAP);
        }
      } else if (state.moving && speed <= STOP_SPEED) {
        state.moving = false;
        state.cooldown = 0;
        this.onSettle?.(panFor(body));
      }
      this.states.set(body, state);
    }
  }

  reset() { this.states = new WeakMap(); }
}
