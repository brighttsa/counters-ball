// Keyboard alternative to the slingshot drag. Any aim key picks up the cap nearest the ball,
// pointed at the ball; arrows (or A/D, W/S) turn the aim and set the power, Q/E switch caps,
// Space or Enter flicks, Escape puts the cap down. It drives the drag input's own selection,
// pull vector and visuals, so a keyboard flick is exactly as strong as a drag of the same length
// and the rest of the game (tutorial, camera lock, cancel on turn change) cannot tell them apart.
import { MAX_PULL, MAX_FLICK_SPEED } from '../core/pitch-dimensions-and-constants.js';

const AIM_STEP = Math.PI / 36; // 5°; Shift turns 1°
const FINE_AIM_STEP = Math.PI / 180;
const POWER_STEP = 0.05;
const START_POWER = 0.5;
const MIN_POWER = 0.1;
// Seen from above, turning "right" is clockwise on screen for every camera the game uses.
const ACTIONS = {
  ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right',
  ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down',
  q: 'prev', '[': 'prev', e: 'next', ']': 'next',
  ' ': 'fire', Enter: 'fire', Escape: 'cancel',
};
export const KEYBOARD_AIM_HELP = '←/→ aim · ↑/↓ power · Space flicks · Q/E switch cap · Esc puts it down';
// The gesture a perfectly still drag would report: no draw-speed bonus, full stability.
const STILL_GESTURE = Object.freeze({ stability: 1, speed: 0, boost: 1 });

export const keyboardAction = (key) => ACTIONS[key.length === 1 ? key.toLowerCase() : key] ?? null;

export class KeyboardFlickAim {
  /** @param host the HumanDragAimInput whose selection, pull, visuals and callbacks this shares */
  constructor(host) {
    this.host = host;
    this.aiming = false;
    this.angle = 0;
    this.power = START_POWER;
    this.onKey = (e) => this.key(e);
    if (typeof window !== 'undefined') window.addEventListener('keydown', this.onKey, true);
    if (typeof document !== 'undefined') {
      this.help = document.createElement('p');
      this.help.className = 'keyboard-aim-help';
      this.help.hidden = true;
      this.help.textContent = KEYBOARD_AIM_HELP;
      document.body.append(this.help);
    }
  }

  caps() {
    return this.host.entries.filter((entry) => this.host.canControl(entry.side));
  }

  key(e) {
    if (e.altKey || e.ctrlKey || e.metaKey || typeof document === 'undefined') return;
    if (document.body.dataset.screen !== 'match' || /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName ?? '')) return;
    const action = keyboardAction(e.key);
    if (!action) return;
    if (this.host.selected && !this.aiming) return; // a pointer drag already holds a cap
    if (action === 'cancel') {
      if (!this.aiming) return; // Escape then falls through to the pause shortcut
      this.putDown();
    } else {
      // Space/Enter on a focused button (skip replay, camera panel) keeps its normal meaning.
      if (action === 'fire' && !this.aiming && e.target?.closest?.('button, [role="button"]')) return;
      if (!this.act(action, e.shiftKey)) return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  /** Applies one action; false when there is nothing to control (not this player's turn). */
  act(action, fine = false) {
    const caps = this.caps();
    if (!caps.length) { if (this.aiming) this.putDown(); return false; }
    if (!this.aiming || !caps.includes(this.host.selected)) {
      this.pickUp(this.nearestToBall(caps));
      if (action === 'fire') return true; // the first press only picks the cap up
    }
    const step = fine ? FINE_AIM_STEP : AIM_STEP;
    if (action === 'left') this.angle -= step;
    else if (action === 'right') this.angle += step;
    else if (action === 'up') this.power = Math.min(1, this.power + POWER_STEP);
    else if (action === 'down') this.power = Math.max(MIN_POWER, this.power - POWER_STEP);
    else if (action === 'next' || action === 'prev') {
      const i = caps.indexOf(this.host.selected);
      this.pickUp(caps[(i + (action === 'next' ? 1 : caps.length - 1)) % caps.length], this.power);
    } else if (action === 'fire') { this.fire(); return true; }
    this.show();
    return true;
  }

  nearestToBall(caps) {
    const ball = this.host.ballBody?.pos;
    if (!ball) return caps[0];
    return caps.reduce((best, e) => (e.body.pos.distanceTo(ball) < best.body.pos.distanceTo(ball) ? e : best));
  }

  pickUp(entry, power = START_POWER) {
    const { host } = this;
    if (this.aiming && host.selected !== entry) host.juice.release(host.selected, 0);
    const ball = host.ballBody?.pos;
    this.angle = ball ? Math.atan2(ball.y - entry.body.pos.y, ball.x - entry.body.pos.x) : 0;
    this.power = power;
    const first = !this.aiming;
    this.aiming = true;
    host.selected = entry;
    host.domElement.classList.add('aiming');
    if (this.help) this.help.hidden = false;
    this.show();
    if (first) host.onAimStart?.(entry);
  }

  show() {
    const { host } = this;
    host.pull.set(Math.cos(this.angle), Math.sin(this.angle)).multiplyScalar(this.power * MAX_PULL);
    host.visuals.show(host.selected.body, host.pull);
    host.juice.press(host.selected, host.pull, this.power);
  }

  fire() {
    const { host } = this;
    const entry = host.selected;
    const velocity = host.pull.clone().normalize().multiplyScalar(this.power * MAX_FLICK_SPEED);
    this.stop();
    host.clearSelection();
    host.onFlick(entry, velocity, STILL_GESTURE);
  }

  putDown() {
    const entry = this.host.selected;
    this.stop();
    this.host.juice.release(entry, 0);
    this.host.clearSelection();
  }

  /** Forget keyboard aiming; the host clears its own selection and visuals. */
  stop() {
    this.aiming = false;
    if (this.help) this.help.hidden = true;
  }

  dispose() {
    this.stop();
    if (typeof window !== 'undefined') window.removeEventListener('keydown', this.onKey, true);
    this.help?.remove();
  }
}
