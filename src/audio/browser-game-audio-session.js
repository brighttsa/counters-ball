const captures = new WeakMap();

function audioSession(environment) {
  try { return environment.navigator?.audioSession; } catch { return null; }
}

export function useGamePlaybackAudioSession(environment = globalThis) {
  const session = audioSession(environment);
  if (!session) return;
  const capture = captures.get(session);
  if (capture) capture.restore = 'playback';
  else {
    try { session.type = 'playback'; } catch { /* Optional browser API. */ }
  }
}

export function acquireMicrophoneAudioSession(environment = globalThis) {
  const session = audioSession(environment);
  if (!session) return () => {};
  let capture = captures.get(session);
  if (!capture) {
    try {
      capture = { count: 0, restore: session.type };
      // WebKit refuses microphone capture while the game forces playback-only audio.
      session.type = 'play-and-record';
      captures.set(session, capture);
    } catch { return () => {}; }
  }
  capture.count++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--capture.count) return;
    captures.delete(session);
    try {
      if (session.type === 'play-and-record') session.type = capture.restore;
    } catch { /* Older browsers may remove access during page teardown. */ }
  };
}
