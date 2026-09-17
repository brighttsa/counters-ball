// Converts real frame time into simulation time. Hit-stop freezes the action
// for a few frames on hard contacts (the "weight" in every great impact);
// slow motion stretches the moment a shot is about to cross the goal line.
const SLOW_MOTION_EASE_OUT = 0.22; // seconds spent easing back to full speed

export class GameTimeController {
  constructor() {
    this.reset();
  }

  reset() {
    this.hitStopLeft = 0;
    this.slowScale = 1;
    this.slowLeft = 0;
  }

  hitStop(seconds) {
    this.hitStopLeft = Math.max(this.hitStopLeft, seconds);
  }

  slowMotion(scale, seconds) {
    this.slowScale = scale;
    this.slowLeft = Math.max(this.slowLeft, seconds);
  }

  get isSlowMotion() {
    return this.slowLeft > 0;
  }

  /** @returns {number} simulation dt for this frame */
  step(realDt) {
    if (this.hitStopLeft > 0) {
      this.hitStopLeft -= realDt;
      return 0;
    }
    if (this.slowLeft > 0) {
      this.slowLeft = Math.max(0, this.slowLeft - realDt);
      const blend = Math.min(1, this.slowLeft / SLOW_MOTION_EASE_OUT);
      return realDt * (1 + (this.slowScale - 1) * blend);
    }
    return realDt;
  }
}
