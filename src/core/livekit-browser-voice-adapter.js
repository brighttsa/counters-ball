// Inject the pinned SDK only when voice is explicitly requested.
export function createLiveKitBrowserVoiceAdapter(sdk, audioHost, onRemoteAudioActivity = () => {}) {
  const room = new sdk.Room({ adaptiveStream: false, dynacast: false });
  const elements = new Set();
  room.on(sdk.RoomEvent.TrackSubscribed, track => {
    if (track.kind !== sdk.Track.Kind.Audio) return;
    const element = track.attach();
    element.autoplay = true; element.playsInline = true;
    audioHost.append(element); elements.add(element);
  });
  room.on(sdk.RoomEvent.TrackUnsubscribed, track => {
    for (const element of track.detach()) { element.remove(); elements.delete(element); }
  });
  room.on(sdk.RoomEvent.ActiveSpeakersChanged, speakers =>
    onRemoteAudioActivity(speakers.some(speaker => !speaker.isLocal)));
  return {
    async connect({ url, token }) {
      await room.connect(url, token, { autoSubscribe: true });
      await room.startAudio();
    },
    capture: () => sdk.createLocalAudioTrack({
      echoCancellation: true, noiseSuppression: true, autoGainControl: true,
    }),
    publish: track => room.localParticipant.publishTrack(track, {
      source: sdk.Track.Source.Microphone, stopMicTrackOnMute: true,
    }),
    unpublish: track => room.localParticipant.unpublishTrack(track, true),
    async disconnect() {
      await room.disconnect(true);
      onRemoteAudioActivity(false);
      for (const element of elements) element.remove();
      elements.clear();
    },
  };
}
