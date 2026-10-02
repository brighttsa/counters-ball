import { createTableTalkBrowserMicrophoneCapture } from './table-talk-browser-microphone-capture.js';

// Inject the pinned SDK only when voice is explicitly requested.
export function createLiveKitBrowserVoiceAdapter(sdk, audioHost, onRemoteAudioActivity = () => {}, onPlaybackBlocked = () => {}) {
  const room = new sdk.Room({ adaptiveStream: false, dynacast: false });
  const elements = new Set();
  const playback = new Map();
  const microphone = createTableTalkBrowserMicrophoneCapture(sdk);

  async function play(element) {
    element.muted = false;
    element.volume = 1;
    try {
      await element.play?.();
      playback.set(element, true);
    } catch { playback.set(element, false); }
    onPlaybackBlocked([...playback.values()].some(playing => !playing));
  }

  room.on(sdk.RoomEvent.TrackSubscribed, track => {
    if (track.kind !== sdk.Track.Kind.Audio) return;
    const element = track.attach();
    element.autoplay = true; element.playsInline = true;
    audioHost.append(element); elements.add(element);
    play(element);
  });
  room.on(sdk.RoomEvent.TrackUnsubscribed, track => {
    for (const element of track.detach()) { element.remove(); elements.delete(element); playback.delete(element); }
    onPlaybackBlocked([...playback.values()].some(playing => !playing));
  });
  room.on(sdk.RoomEvent.ActiveSpeakersChanged, speakers =>
    onRemoteAudioActivity(speakers.some(speaker => !speaker.isLocal)));
  return {
    async connect({ url, token }) {
      await room.connect(url, token, { autoSubscribe: true });
      try { await room.startAudio(); } catch { onPlaybackBlocked(true); }
    },
    async resumeAudio() {
      try { await room.startAudio(); } catch { /* Element playback below can still recover independently. */ }
      await Promise.all([...elements].map(play));
    },
    capture: microphone.capture,
    cancelCapture: microphone.cancel,
    publish: track => room.localParticipant.publishTrack(track, {
      source: sdk.Track.Source.Microphone, stopMicTrackOnMute: true,
    }),
    unpublish: track => room.localParticipant.unpublishTrack(track, true),
    async disconnect() {
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
