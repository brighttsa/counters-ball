import { SkillPlayEventTracker } from './skill-play-event-tracker.js';
import { CompactTransformReplay } from './compact-transform-replay.js';

const soundKey = { 'SWEET SPOT': 'sweetSpot', BOUNCE: 'bank', COUNTER: 'counter', 'STREET PLAY': 'streetPlay' };

export class MatchPresentationDirector {
  constructor(session) {
    this.session = session;
    this.skills = new SkillPlayEventTracker((label, event) => {
      session.hud.event(label, { direction: event.direction, priority: label === 'COUNTER' ? 3 : 2 });
      session.sound.event?.(soundKey[label], 0.5);
      if (label === 'SWEET SPOT') session.particles.contactFlash(session.ballBody.pos.x, session.ballBody.pos.y);
      this.syncHeat();
    });
    this.replay = new CompactTransformReplay([
      ...session.entries.flatMap((e) => [e.pivot, e.mesh]), session.stage.ballMesh,
    ]);
    this.matchPointKey = '';
  }
  syncHeat() {
    const { home, away } = this.skills.heat;
    this.session.sound.setHeat?.(Math.max(home, away) / 5);
  }
  begin(entry, velocity, gesture) {
    this.session.sound.setTension?.(false);
    this.skills.begin(entry, velocity, this.session.ballBody, gesture);
    this.replay.reset();
    this.replay.capture(0);
  }
  turn(side) {
    this.skills.settle();
    this.syncHeat();
    const { rules, cameraDirector, hud, sound } = this.session;
    const critical = rules.scores[side] === rules.rules.goalsToWin - 1;
    cameraDirector.setTension(critical ? 1 : 0);
    // Heard tension only once it means something: after a goal, or on a side's last three flicks.
    // (A first-to-1 table is "critical" from flick one; a hum all match is noise, not drama.)
    const late = rules.scores.home + rules.scores.away > 0 || rules.flicksLeft(side) <= 3;
    sound.setTension?.(critical && late);
    const key = `${side}:${rules.scores.home}:${rules.scores.away}`;
    // On a first-to-1 table every flick is match point, so saying it would only shout over each kickoff.
    if (critical && rules.rules.goalsToWin > 1 && key !== this.matchPointKey) {
      this.matchPointKey = key;
      hud.event('MATCH POINT', { priority: 4, duration: 0.9 });
      sound.event?.('matchPoint');
    }
  }
  goal(scorer) {
    this.skills.update(0, this.session.ballBody);
    this.highlight = this.skills.goal(scorer);
    this.captureGoalFrame = true;
    return this.highlight.label;
  }
  afterGoal() {
    const s = this.session;
    if (!s.options.isAttract && this.highlight?.replay && s.cameraDirector.motionEnabled && this.replay.start()) {
      s.particles.setVisible(false);
      s.hud.clearEvents();
      const view = this.highlight.label === 'STREET PLAY' ? 'HERO CAM'
        : this.highlight.label === 'BOUNCE GOAL' ? 'TOP CAM'
          : this.highlight.label === 'SWEET SPOT' ? 'GROUND CAM' : 'TRACKING CAM';
      s.hud.replay(true, `${view} / REPLAY`);
      s.cameraDirector.setReplayFocus(s.stage.ballMesh.position);
      s.cameraDirector.setReplay(true, this.highlight.direction, view);
      return;
    }
    s.rules.finishGoalCelebration();
  }
  update(dt) {
    const s = this.session;
    if (s.paused) return this.replay.active || Boolean(this.pendingContinuation);
    if (this.pendingContinuation) {
      this.pendingContinuation = false;
      s.rules.finishGoalCelebration();
      return true;
    }
    s.hud.update(dt);
    if (this.replay.active) {
      this.replay.update(dt);
      s.cameraDirector.setReplayFocus(s.stage.ballMesh.position);
      if (!this.replay.active) this.finishReplay();
      return true;
    }
    return false;
  }
  capture(dt) {
    if (this.captureGoalFrame) {
      this.replay.capture(dt, true);
      this.captureGoalFrame = false;
    } else if (this.session.rules.phase === 'moving') this.replay.capture(dt);
  }
  finishReplay() {
    this.replay.stop();
    const s = this.session;
    s.particles.setVisible(true);
    s.hud.replay(false);
    s.cameraDirector.setReplay(false);
    // Motion preferences can change while paused; only resume may advance rules.
    if (s.paused) this.pendingContinuation = true;
    else s.rules.finishGoalCelebration();
  }
  dispose() { this.replay.stop(); this.session.cameraDirector.setReplay(false); }
}
