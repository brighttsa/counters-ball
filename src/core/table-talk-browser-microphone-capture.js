import { acquireMicrophoneAudioSession } from '../audio/browser-game-audio-session.js';

const CAPTURE_ERRORS = {
  NotAllowedError: 'microphone-denied', SecurityError: 'microphone-denied',
  NotFoundError: 'microphone-missing', NotReadableError: 'microphone-busy',
};
const failure = code => Object.assign(new Error(code), { code });

export function createTableTalkBrowserMicrophoneCapture(sdk, environment = globalThis) {
  let pending = null;
  function cancel() { pending?.cancel(); }

  function capture() {
    cancel();
    if (environment.isSecureContext === false || !environment.navigator?.mediaDevices?.getUserMedia) {
      return Promise.reject(failure('microphone-unsupported'));
    }
    return new Promise((resolve, reject) => {
      const releaseAudioSession = acquireMicrophoneAudioSession(environment);
      let settled = false;
      const request = { cancel: () => finish(null, 'microphone-cancelled') };
      const timer = environment.setTimeout(() => finish(null, 'microphone-timeout'), 30_000);
      pending = request;
      function finish(track, code) {
        if (settled) { track?.stop(); return; }
        settled = true;
        environment.clearTimeout(timer);
        if (pending === request) pending = null;
        if (code) { releaseAudioSession(); reject(failure(code)); } else resolve(track);
      }
      try {
        // Keep getUserMedia in the tap's call stack; a permission preflight must not consume the gesture.
        const result = sdk.createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true, autoGainControl: true });
        Promise.resolve(result).then(track => {
          const stop = track.stop.bind(track);
          const ended = () => {
            track.mediaStreamTrack?.removeEventListener?.('ended', ended);
            releaseAudioSession();
          };
          // Keep the real SDK track identity; all mute/leave/error paths already stop it.
          track.stop = () => { try { return stop(); } finally { ended(); } };
          track.mediaStreamTrack?.addEventListener?.('ended', ended, { once: true });
          finish(track);
        }, error => finish(null, CAPTURE_ERRORS[error?.name] ?? 'microphone-unavailable'));
      } catch (error) { finish(null, CAPTURE_ERRORS[error?.name] ?? 'microphone-unavailable'); }
    });
  }
  return { capture, cancel };
}
