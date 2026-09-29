const clamp01 = (value) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.5));

export class MatchMomentAudioDirector {
  constructor({ schedule, net, whistle, reward, reaction, duck } = {}) {
    Object.assign(this, { schedule, net, whistle, reward, reaction, duck });
  }

  goal({ pan = 0, significance = 0.5, positive = true } = {}) {
    const strength = clamp01(significance);
    this.duck?.(0.42, 1.8);
    this.net?.(pan);
    this.schedule?.(0.09, () => {
      this.whistle?.();
      this.reaction?.(positive ? 'cheer' : 'disappointment', strength, pan);
      this.reward?.(strength, pan);
    });
  }

  nearMiss({ pan = 0, significance = 0.35 } = {}) {
    const strength = clamp01(significance);
    this.duck?.(0.72, 0.6);
    this.schedule?.(0.045, () => this.reaction?.('near-miss', strength, pan));
  }
}
