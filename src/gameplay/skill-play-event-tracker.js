// Observes real contacts. Recognition never writes to a physics body.
export const SKILL_TUNING = Object.freeze({ alignment: 0.94, strength: 0.22, advance: 0.35, window: 2.5 });
const signOf = (side) => side === 'home' ? 1 : -1;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class SkillPlayEventTracker {
  constructor(onEvent = () => {}) {
    this.onEvent = onEvent;
    this.heat = { home: 0, away: 0 };
    this.lastTouch = null;
    this.shot = null;
  }

  begin(entry, velocity, ball, gesture = null) {
    const length = Math.hypot(velocity.x, velocity.y) || 1;
    this.shot = {
      side: entry.side, body: entry.body, startX: ball.pos.x, age: 0,
      dx: velocity.x / length, dz: velocity.y / length, gesture,
      defensive: ball.pos.x * signOf(entry.side) < -0.35 && this.lastTouch !== null && this.lastTouch !== entry.side,
      touched: false, wall: false, bank: false, counter: false, sweet: false,
      chain: new Set([entry.body]), strikeChainSize: 0, awarded: new Set(), lastBallSide: null, peakSpeed: 0,
    };
  }

  award(label, points = 1) {
    const s = this.shot;
    if (!s || s.awarded.has(label)) return;
    s.awarded.add(label);
    this.heat[s.side] = clamp(this.heat[s.side] + points, 0, 5);
    this.onEvent(label, { side: s.side, direction: signOf(s.side), heat: { ...this.heat } });
  }

  impact(a, b, strength) {
    const s = this.shot;
    if (!s) return;
    if (a.kind === 'cap' && b.kind === 'cap' && strength > 0.08) {
      if (s.chain.has(a) || s.chain.has(b)) { s.chain.add(a); s.chain.add(b); }
    }
    const ball = a.kind === 'ball' ? a : b.kind === 'ball' ? b : null;
    const cap = ball === a ? b : a;
    if (!ball || cap.kind !== 'cap') return;
    this.lastTouch = cap.side;
    s.lastBallSide = cap.side;
    if (cap.side !== s.side || !s.chain.has(cap)) return;
    s.touched = true;
    s.strikeChainSize = s.chain.size;
    const nx = ball.pos.x - cap.pos.x, nz = ball.pos.y - cap.pos.y;
    const distance = Math.hypot(nx, nz) || 1;
    const alignment = (s.dx * nx + s.dz * nz) / distance;
    const speed = Math.hypot(ball.vel.x, ball.vel.y);
    s.peakSpeed = Math.max(s.peakSpeed, speed);
    // Human execution is measured, not rolled; AI contacts are not called Sweet Spot.
    if (cap === s.body && s.gesture && s.age < SKILL_TUNING.window && !s.wall
        && alignment >= SKILL_TUNING.alignment && strength >= SKILL_TUNING.strength
        && s.gesture.stability >= 0.9 && ball.vel.x * signOf(s.side) > 0.5) {
      s.sweet = true;
      this.award('SWEET SPOT');
    }
  }

  wall(body, strength) {
    const s = this.shot;
    if (!s || strength < 0.12 || s.age > SKILL_TUNING.window) return;
    if ((body.kind === 'ball' && s.touched && s.lastBallSide === s.side)
        || (!s.touched && s.chain.has(body))) s.wall = true;
  }

  update(dt, ball) {
    const s = this.shot;
    if (!s) return;
    s.age += dt;
    if (!s.touched || s.lastBallSide !== s.side || s.age > SKILL_TUNING.window) return;
    const direction = signOf(s.side);
    const advance = (ball.pos.x - s.startX) * direction;
    const threatening = advance > SKILL_TUNING.advance && ball.vel.x * direction > 0.45;
    if (s.wall && threatening) { s.bank = true; this.award('BOUNCE'); }
    if (s.defensive && threatening && ball.pos.x * direction > 0) {
      s.counter = true;
      this.award('COUNTER');
    }
  }

  goal(scorer) {
    const s = this.shot;
    if (!s || s.side !== scorer || !s.touched || s.lastBallSide !== scorer) return { label: '', replay: false };
    const street = s.strikeChainSize >= 2 || (s.bank && s.counter);
    if (street) this.award('STREET PLAY', 2);
    const label = street ? 'STREET PLAY' : s.counter ? 'COUNTER GOAL' : s.bank ? 'BOUNCE GOAL' : s.sweet ? 'SWEET SPOT' : '';
    return { label, replay: Boolean(label) || s.peakSpeed > 3.8, direction: signOf(scorer) };
  }

  settle() {
    if (this.shot && !this.shot.awarded.size) {
      const side = this.shot.side;
      this.heat[side] = Math.max(0, this.heat[side] - 1);
    }
    this.shot = null;
  }

  kickoff() { this.shot = null; this.lastTouch = null; }
}
