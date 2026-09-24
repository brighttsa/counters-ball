// Kwame's Corner coach: runs the practice lessons on a solo table. Kwame's line sits in a card under the
// scoreboard; the lesson's chalk ring or bank line is drawn over the table; a miss on a target lesson
// resets the table ("Again!"); the last lesson ends with a sign-off and hands back to the title screen.
import * as THREE from 'three';
import { PRACTICE_LESSONS, PRACTICE_FINISH_LINE, PRACTICE_MAX_MISSES, applyPracticeSetup, lessonLine } from '../gameplay/kwame-corner-practice-lesson-steps.js';
import { findRailBank } from '../gameplay/chalk-hint-shot-geometry.js';

const SVG = 'http://www.w3.org/2000/svg';
const FINISH_SECONDS = 3.5;

export class KwameCornerCoach {
  /** @param onComplete () => void, after the sign-off */
  constructor(session, { onComplete } = {}) {
    Object.assign(this, { session, onComplete, index: 0, needsSetup: true, finishing: 0, phase: null });
    this.card = document.createElement('section');
    this.card.id = 'kwame-coach';
    this.card.setAttribute('role', 'status');
    this.card.innerHTML = '<span class="kwame-coach-kicker"></span><p class="kwame-coach-line"></p>';
    this.svg = document.createElementNS(SVG, 'svg');
    this.svg.classList.add('chalk-hint-path', 'kwame-coach-chalk');
    this.ring = document.createElementNS(SVG, 'polygon');
    this.bank = document.createElementNS(SVG, 'polyline');
    this.svg.append(this.ring, this.bank);
    document.body.append(this.svg, this.card);
    this.card.hidden = true;
    this.svg.style.display = 'none';
    session.rules.on('goal', ({ scorer }) => { if (scorer === 'home' && this.attempt) this.attempt.scored = true; });
    session.rules.on('kickoff', () => { this.needsSetup = true; }); // a goal reset the table: lay the lesson out again
    this.previousDenied = session.physics.onGoalDenied;
    session.physics.onGoalDenied = (sign) => { this.previousDenied?.(sign); this.say('Off the rail first! Again.'); };
    this.show();
  }

  get lesson() { return PRACTICE_LESSONS[this.index]; }

  say(text, kicker = null) {
    this.card.querySelector('.kwame-coach-line').textContent = text;
    this.card.querySelector('.kwame-coach-kicker').textContent = kicker
      ?? (this.lesson ? `Kwame · lesson ${this.index + 1} of ${PRACTICE_LESSONS.length}` : 'Kwame');
  }

  show() {
    if (!this.lesson) return;
    this.say(lessonLine(this.lesson));
    for (const lesson of PRACTICE_LESSONS) document.getElementById(lesson.glow ?? '')?.classList.remove('chalk-hint-glow');
    if (this.lesson.glow) document.getElementById(this.lesson.glow)?.classList.add('chalk-hint-glow');
  }

  begin() {
    const { session } = this;
    const setup = this.lesson.setup;
    if (setup) applyPracticeSetup(session, setup);
    this.attempt = { ballStart: session.ballBody.pos.clone(), ballMoved: false, restedInRing: false, scored: false };
    this.bankPath = setup?.bankLine ? findRailBank(session.physics, session.ballBody.pos, 'home') : null;
    this.needsSetup = false;
  }

  advance() {
    this.index += 1;
    this.needsSetup = true;
    this.misses = 0;
    if (this.lesson) { this.show(); return; }
    this.say(PRACTICE_FINISH_LINE, 'Kwame');
    this.finishing = FINISH_SECONDS;
    document.getElementById('camera-menu')?.classList.remove('chalk-hint-glow');
  }

  /** Called every frame after the camera has moved. */
  update(camera, control, dt = 0) {
    const { session } = this;
    if (session.disposed) return;
    const live = session.rules.phase !== 'waiting' && !session.paused;
    this.card.hidden = !live;
    if (this.finishing) {
      this.finishing = Math.max(0, this.finishing - dt);
      if (!this.finishing) this.onComplete?.();
      return this.draw(camera);
    }
    if (!live || !this.lesson) return this.draw(camera);
    const phase = session.rules.phase;
    const resting = phase === 'aiming' && session.physics.allBodiesResting();
    if (this.needsSetup && resting) this.begin();
    if (this.attempt && phase === 'moving' && session.ballBody.pos.distanceTo(this.attempt.ballStart) > .03) this.attempt.ballMoved = true;
    // A flick has just settled: judge the target lessons, and reset the table after a miss.
    const settled = this.phase === 'moving' && phase === 'aiming';
    if (settled && this.attempt && this.lesson.setup?.ring) {
      const { x, y, r } = this.lesson.setup.ring;
      this.attempt.restedInRing = Math.hypot(session.ballBody.pos.x - x, session.ballBody.pos.y - y) <= r;
    }
    this.phase = phase;
    if (this.attempt && !this.needsSetup && this.lesson.done({ session, control, attempt: this.attempt })) {
      this.advance();
    } else if (settled && this.lesson.retry) {
      this.misses = (this.misses ?? 0) + 1;
      if (this.misses >= PRACTICE_MAX_MISSES) {
        this.advance();
        this.say(`Good try, you've got the idea. ${this.lesson ? lessonLine(this.lesson) : ''}`.trim());
      } else {
        this.say(`Again! ${lessonLine(this.lesson)}`);
        this.needsSetup = true;
      }
    }
    this.draw(camera);
  }

  screen(camera, x, y) {
    const p = new THREE.Vector3(x, .02, y).project(camera);
    return `${((p.x + 1) / 2 * innerWidth).toFixed(1)},${((1 - p.y) / 2 * innerHeight).toFixed(1)}`;
  }

  // The lesson's chalk marks on the table: a target ring, or the bank path off the rail.
  draw(camera) {
    const ring = !this.finishing && this.lesson?.setup?.ring;
    const bank = !this.finishing && this.bankPath && !this.needsSetup;
    this.svg.style.display = !this.card.hidden && (ring || bank) ? '' : 'none';
    this.ring.style.display = ring ? '' : 'none';
    this.bank.style.display = bank ? '' : 'none';
    if (ring) {
      const points = Array.from({ length: 32 }, (_, i) => {
        const a = i / 32 * Math.PI * 2;
        return this.screen(camera, ring.x + Math.cos(a) * ring.r, ring.y + Math.sin(a) * ring.r);
      });
      this.ring.setAttribute('points', points.join(' '));
    }
    if (bank) {
      const { ball, bank: rail, goal } = this.bankPath;
      this.bank.setAttribute('points', [ball, rail, goal].map(p => this.screen(camera, p.x, p.y)).join(' '));
    }
  }

  dispose() {
    for (const lesson of PRACTICE_LESSONS) document.getElementById(lesson.glow ?? '')?.classList.remove('chalk-hint-glow');
    this.session.physics.goalRequiresTouchOf = null;
    this.session.physics.onGoalDenied = this.previousDenied;
    this.card.remove();
    this.svg.remove();
  }
}
