const MICROPHONE_ERRORS = new Set(['microphone-denied', 'microphone-missing', 'microphone-busy',
  'microphone-unsupported', 'microphone-timeout', 'microphone-unavailable']);

export class PrivateRoomVoiceSession {
  constructor(createAdapter, onChange = () => {}) {
    this.createAdapter = createAdapter;
    this.onChange = onChange;
    this.state = 'idle'; this.error = null;
    this.epoch = 0; this.intent = 0;
    this.adapter = null; this.track = null;
  }

  notify(state, error = null) {
    this.state = state; this.error = error;
    this.onChange({ state, error });
  }

  async join(credentials) {
    if (this.state !== 'idle') return;
    const epoch = ++this.epoch;
    const adapter = this.createAdapter(); this.adapter = adapter;
    this.notify('connecting');
    try {
      await adapter.connect(credentials);
      if (epoch !== this.epoch) { await adapter.disconnect(); return; }
      this.notify('listening');
    } catch {
      await adapter.disconnect().catch(() => {});
      if (epoch === this.epoch) {
        this.adapter = null; this.notify('idle', 'voice-unavailable');
      }
    }
  }

  async unmute() {
    if (this.state !== 'listening') return;
    const adapter = this.adapter, epoch = this.epoch, intent = ++this.intent;
    const current = () => epoch === this.epoch && intent === this.intent;
    this.notify('requesting-microphone');
    let track;
    try {
      track = await adapter.capture();
      if (!current()) { track.stop(); return; }
      this.track = track;
      await adapter.publish(track);
      if (!current()) {
        track.stop(); await adapter.unpublish(track).catch(() => {}); return;
      }
      this.notify('speaking');
    } catch (error) {
      track?.stop();
      if (track) await adapter.unpublish(track).catch(() => {});
      if (current()) {
        this.track = null;
        this.notify('listening', MICROPHONE_ERRORS.has(error?.code) ? error.code : 'microphone-unavailable');
      }
    }
  }

  async mute() {
    ++this.intent;
    const track = this.track, adapter = this.adapter;
    adapter?.cancelCapture?.();
    this.track = null;
    // Stop the device synchronously even if signalling or permission is pending.
    track?.stop();
    if (this.state === 'speaking' || this.state === 'requesting-microphone') {
      this.notify('listening');
    }
    if (track) await adapter.unpublish(track).catch(() => {});
  }

  async leave() {
    ++this.epoch; ++this.intent;
    const adapter = this.adapter, track = this.track;
    adapter?.cancelCapture?.();
    this.track = null; this.adapter = null;
    track?.stop(); this.notify('idle');
    await adapter?.disconnect().catch(() => {});
  }
}
