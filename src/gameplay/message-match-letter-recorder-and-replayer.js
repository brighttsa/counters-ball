// Message Match on one device: records this player's move into a letter, and replays the
// friend's letter flick by flick through the real rules and physics before handing over the table.
// The physics steps at a fixed rate, so a replay from the same table matches the sender; each
// flick still snaps to the sender's settled positions so no drift can ever build up.

const REPLAY_LEAD_IN = 0.8;   // game seconds before each replayed flick: time to see whose cap it is
const REPLAY_BETWEEN = 0.5;

/** Every body's position in a fixed order: caps as the stage lists them, then the ball. */
export function readTable(session) {
  return [...session.entries.map((e) => e.body), session.ballBody].flatMap((b) => [b.pos.x, b.pos.y]);
}

export function writeTable(session, flat) {
  const bodies = [...session.entries.map((e) => e.body), session.ballBody];
  if (flat.length !== bodies.length * 2) return false;
  bodies.forEach((b, i) => { b.pos.set(flat[i * 2], flat[i * 2 + 1]); b.prev.copy(b.pos); b.vel.set(0, 0); });
  session.physics.accumulator = 0;
  session.syncMeshes(0);
  return true;
}

export class MessageMatchLetters {
  /**
   * @param session a MatchSession whose controllers are { [mySide]: 'human', [theirSide]: 'remote' }
   * @param options { mySide, levelId, names, seq, onLetter(letter) }
   */
  constructor(session, { mySide, levelId, names, seq = 0, onLetter }) {
    Object.assign(this, { session, mySide, levelId, names, seq, onLetter, recording: null, waiting: null });
    const { rules } = session;
    rules.on('turn', (side) => this.settled('turn', side));
    rules.on('end', () => this.settled('end', null));

    const flick = session.flick.bind(session);
    session.flick = (entry, velocity, gesture) => {
      if (entry.side === this.mySide && rules.canFlick(entry.side)) {
        this.recording ??= { before: readTable(session), rulesBefore: rules.snapshot(), flicks: [] };
        this.recording.flicks.push({ entry: session.entries.indexOf(entry), vx: velocity.x, vy: velocity.y, after: null });
      }
      flick(entry, velocity, gesture);
    };
  }

  /** The table came to rest (or the match ended): close off a recorded flick, maybe post the letter. */
  settled(kind, side) {
    const resolve = this.waiting;
    this.waiting = null;
    resolve?.({ kind, side });
    const rec = this.recording;
    if (!rec) return;
    const last = rec.flicks.at(-1);
    if (last && !last.after) last.after = readTable(this.session);
    if (kind === 'turn' && side === this.mySide) return; // own goal or they are out of flicks: keep going
    this.recording = null;
    this.seq += 1;
    this.onLetter({
      levelId: this.levelId, names: this.names, seq: this.seq, by: this.mySide,
      before: rec.before, rulesBefore: rec.rulesBefore, flicks: rec.flicks, rulesAfter: this.session.rules.snapshot(),
    });
  }

  nextSettle() {
    return new Promise((resolve) => { this.waiting = resolve; });
  }

  pause(seconds) {
    return new Promise((resolve) => this.session.schedule(seconds, resolve));
  }

  /** Plays the friend's move, then leaves the table exactly as they left it. Resolves when it's our turn (or full time). */
  async replay(letter) {
    const { session } = this;
    const { rules } = session;
    this.seq = letter.seq;
    if (!writeTable(session, letter.before)) throw new Error('letter does not fit this table');
    rules.restore(letter.rulesBefore);
    this.syncHud();
    rules.emit('turn', letter.by);
    for (const [i, f] of letter.flicks.entries()) {
      await this.pause(i ? REPLAY_BETWEEN : REPLAY_LEAD_IN);
      if (session.disposed) return;
      const entry = session.entries[f.entry];
      if (!entry || entry.side !== letter.by || !rules.canFlick(letter.by)) break;
      const settle = this.nextSettle();
      session.flick(entry, entry.body.vel.clone().set(f.vx, f.vy));
      const { kind } = await settle;
      if (session.disposed) return;
      if (kind === 'end') break;
      writeTable(session, f.after);
    }
    this.adopt(letter.rulesAfter, letter.flicks.at(-1).after);
  }

  /** Take the sender's final word on the score and table, whatever the local replay made of it. */
  adopt(rulesAfter, table) {
    const { session } = this;
    const { rules } = session;
    if (rules.phase === 'ended') return;
    const drifted = rules.phase !== 'aiming' || rules.turn !== rulesAfter.turn;
    writeTable(session, table);
    rules.restore({ ...rulesAfter, phase: 'aiming' });
    this.syncHud();
    if (rulesAfter.phase === 'ended') rules.end();
    else if (drifted) rules.emit('turn', rulesAfter.turn); // the local replay already announced the right turn otherwise
  }

  syncHud() {
    const { rules, hud } = this.session;
    hud.setScore(rules.scores);
    hud.setFlicks(rules.flicksLeft('home'), rules.flicksLeft('away'));
  }
}
