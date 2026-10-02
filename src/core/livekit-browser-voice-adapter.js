import { createTableTalkBrowserMicrophoneCapture } from './table-talk-browser-microphone-capture.js';

// Inject the pinned SDK only when voice is explicitly requested.
export function createLiveKitBrowserVoiceAdapter(sdk, audioHost, onRemoteAudioActivity = () => {}, onPlaybackBlocked = () => {}) {
  const room = new sdk.Room({ adaptiveStream: false, dynacast: false });
  const elements = new Set();
  const playback = new Map();
  const microphone = createTableTalkBrowserMicrophoneCapture(sdk);
  let roomAudioBlocked = false, closed = false, pendingAudioStart = null;

  function reportPlayback() {
    if (!closed) onPlaybackBlocked(roomAudioBlocked || [...playback.values()].some(result => !result.playing));
  }

  function startAudio() {
    if (closed) return Promise.resolve();
    if (pendingAudioStart) return pendingAudioStart;
    // The SDK has one playback state; overlapping unlocks must share that state too.
    pendingAudioStart = (async () => {
      try { await room.startAudio(); roomAudioBlocked = room.canPlaybackAudio === false; }
      catch { roomAudioBlocked = true; }
      reportPlayback();
    })().finally(() => { pendingAudioStart = null; });
    return pendingAudioStart;
  }

  function resumeAudio() {
    // Both the SDK context and media elements must start inside the tap, before any await.
    return Promise.all([startAudio(), ...[...elements].map(play)]);
  }

  async function play(element) {
    const result = { playing: false };
    playback.set(element, result);
    element.muted = false;
    element.volume = 1;
    try {
      await element.play?.();
      result.playing = true;
    } catch { result.playing = false; }
    if (playback.get(element) === result) reportPlayback();
  }

  room.on(sdk.RoomEvent.AudioPlaybackStatusChanged, enabled => {
    roomAudioBlocked = !enabled;
    reportPlayback();
  });
  room.on(sdk.RoomEvent.TrackSubscribed, track => {
    if (closed || track.kind !== sdk.Track.Kind.Audio) return;
    const element = track.attach();
    element.autoplay = true; element.playsInline = true;
    audioHost.append(element); elements.add(element);
    play(element);
  });
  room.on(sdk.RoomEvent.TrackUnsubscribed, track => {
    for (const element of track.detach()) { element.remove(); elements.delete(element); playback.delete(element); }
    reportPlayback();
  });
  room.on(sdk.RoomEvent.ActiveSpeakersChanged, speakers =>
    onRemoteAudioActivity(speakers.some(speaker => !speaker.isLocal)));
  return {
    async connect({ url, token }) {
      await room.connect(url, token, { autoSubscribe: true });
      await startAudio();
    },
    resumeAudio,
    capture() {
      const captured = microphone.capture();
      // Permission to capture does not unlock the phone's speaker output.
      void resumeAudio();
      return captured;
    },
    cancelCapture: microphone.cancel,
    publish: track => room.localParticipant.publishTrack(track, {
      source: sdk.Track.Source.Microphone, stopMicTrackOnMute: true,
    }),
    unpublish: track => room.localParticipant.unpublishTrack(track, true),
    async disconnect() {
      closed = true;
      microphone.cancel();
      await room.disconnect(true);
      onRemoteAudioActivity(false);
      onPlaybackBlocked(false);
      for (const element of elements) element.remove();
      elements.clear();
      playback.clear();
    },
  };
}
