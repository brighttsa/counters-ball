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
      let settled = false;
      const request = { cancel: () => finish(null, 'microphone-cancelled') };
      const timer = environment.setTimeout(() => finish(null, 'microphone-timeout'), 30_000);
      pending = request;
      function finish(track, code) {
        if (settled) { track?.stop(); return; }
        settled = true;
        environment.clearTimeout(timer);
        if (pending === request) pending = null;
        if (code) reject(failure(code)); else resolve(track);
      }
      try {
        // Keep getUserMedia in the tap's call stack; a permission preflight must not consume the gesture.
        const result = sdk.createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true, autoGainControl: true });
        Promise.resolve(result).then(track => finish(track), error => finish(null, CAPTURE_ERRORS[error?.name] ?? 'microphone-unavailable'));
      } catch (error) { finish(null, CAPTURE_ERRORS[error?.name] ?? 'microphone-unavailable'); }
    });
  }
  return { capture, cancel };
}
