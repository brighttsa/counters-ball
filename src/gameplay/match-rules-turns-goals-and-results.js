// Pure match state machine: whose flick it is, flick allowances, goals,
// kickoffs and the final result with star flags. No rendering, no physics —
// the session feeds it events and listens for what happens next.
import { SIDE_HOME, SIDE_AWAY, otherSide } from '../core/pitch-dimensions-and-constants.js';

export class MatchRules {
  /**
   * @param {{ goalsToWin:number, flickLimit:number, threeStarFlicks:number }} rules
   * @param {{ home:'human'|'ai', away:'human'|'ai' }} controllers
   */
  constructor(rules, controllers) {
    this.rules = rules;
    this.controllers = controllers;
    this.listeners = {};
    this.reset();
  }

  reset() {
    this.phase = 'waiting'; // waiting → aiming → moving → (goal) → aiming … → ended
    this.turn = SIDE_HOME;
    this.scores = { home: 0, away: 0 };
    this.flicksUsed = { home: 0, away: 0 };
    this.lastScorer = null;
    this.result = null;
  }

  on(event, fn) {
    (this.listeners[event] ??= []).push(fn);
  }

  emit(event, payload) {
    for (const fn of this.listeners[event] ?? []) fn(payload);
  }

  isAi(side) {
    return this.controllers[side] === 'ai';
  }

  flicksLeft(side) {
    return Math.max(0, this.rules.flickLimit - this.flicksUsed[side]);
  }

  start(side = SIDE_HOME) {
    this.passTurnTo(side);
  }

  canFlick(side) {
    return this.phase === 'aiming' && this.turn === side && this.flicksLeft(side) > 0;
  }

  registerFlick(side) {
    if (!this.canFlick(side)) return false;
    this.flicksUsed[side] += 1;
    this.phase = 'moving';
    this.emit('flick', { side, left: this.flicksLeft(side) });
    return true;
  }

  /** @param {number} sign +1 = ball entered the away goal (home scored) */
  registerGoal(sign) {
    if (this.phase === 'goal' || this.phase === 'ended') return;
    const scorer = sign > 0 ? SIDE_HOME : SIDE_AWAY;
    this.scores[scorer] += 1;
    this.lastScorer = scorer;
    this.phase = 'goal';
    this.emit('goal', { scorer, conceder: otherSide(scorer), scores: { ...this.scores } });
  }

  finishGoalCelebration() {
    if (this.phase !== 'goal') return;
    if (this.scores[this.lastScorer] >= this.rules.goalsToWin) {
      this.end();
      return;
    }
    const conceder = otherSide(this.lastScorer);
    this.emit('kickoff', conceder);
    this.passTurnTo(conceder);
  }

  /** Called once every body has settled after a flick without a goal. */
  resolvePlayAtRest() {
    if (this.phase !== 'moving') return;
    this.passTurnTo(otherSide(this.turn));
  }

  passTurnTo(preferred) {
    const fallback = otherSide(preferred);
    const side = this.flicksLeft(preferred) > 0 ? preferred
      : this.flicksLeft(fallback) > 0 ? fallback : null;
    if (!side) {
      this.end();
      return;
    }
    this.phase = 'aiming';
    this.turn = side;
    this.emit('turn', side);
  }

  end() {
    if (this.phase === 'ended') return;
    this.phase = 'ended';
    const { home, away } = this.scores;
    const winner = home > away ? SIDE_HOME : away > home ? SIDE_AWAY : null;
    const homeWon = winner === SIDE_HOME;
    const starFlags = [
      homeWon,
      homeWon && away === 0,
      homeWon && this.flicksUsed.home <= this.rules.threeStarFlicks,
    ];
    this.result = {
      winner,
      scores: { ...this.scores },
      flicksUsed: { ...this.flicksUsed },
      starFlags,
      stars: starFlags.filter(Boolean).length,
    };
    this.emit('end', this.result);
  }
}
