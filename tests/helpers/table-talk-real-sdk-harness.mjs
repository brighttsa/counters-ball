import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

// Exercise the shipped SDK; only the operating system's media boundary is simulated.
export function realVoiceSdk(environment) {
  class MediaStream {
    constructor(tracks = []) { this.tracks = tracks; }
    getTracks() { return this.tracks; }
    getAudioTracks() { return this.tracks.filter(track => track.kind === 'audio'); }
  }
  const context = createContext({ console, setTimeout, clearTimeout, TextEncoder, TextDecoder,
    URL, DOMException, AbortController, MediaStream, navigator: environment.navigator });
  runInContext(readFileSync(new URL('../../assets/vendor/livekit-client-2.22.3.umd.js', import.meta.url), 'utf8'), context);
  return context.LivekitClient;
}

export function microphoneTrack() {
  const track = new EventTarget();
  return Object.assign(track, { id: 'synthetic-microphone', kind: 'audio', enabled: true, readyState: 'live',
    getSettings: () => ({ deviceId: 'default' }), getConstraints: () => ({}),
    stop() { this.readyState = 'ended'; },
  });
}
