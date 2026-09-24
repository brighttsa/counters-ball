// The player's audio preferences, saved with their progress:
//   muted        the ♪ button: all sound off (music and effects)
//   musicVolume  pause menu "Music": Off / Low / Medium / High
//   effectsOff   pause menu "Sound effects": flicks, contacts, whistles and street ambience off
// Changing Music or Sound effects from the pause menu means the player wants sound, so it also lifts ♪.
export const MUSIC_LEVELS = [
  { value: 0, label: 'Off' }, { value: 0.35, label: 'Low' }, { value: 0.7, label: 'Medium' }, { value: 1, label: 'High' },
];
export const DEFAULT_MUSIC_VOLUME = 0.7;

export const musicLabel = (volume) => (MUSIC_LEVELS.find((l) => l.value === volume) ?? MUSIC_LEVELS[2]).label;

/** Next step up, wrapping from High back to Off. */
export function nextMusicVolume(volume) {
  const i = MUSIC_LEVELS.findIndex((l) => l.value === volume);
  return MUSIC_LEVELS[(i + 1) % MUSIC_LEVELS.length].value;
}

/** Push the saved preferences into the sound board, the music and the controls that show them. */
export function applyAudioSettings({ progress, sound, music, menus }) {
  const volume = progress.musicVolume ?? DEFAULT_MUSIC_VOLUME;
  sound.setMuted(progress.muted);
  sound.setEffectsOff?.(Boolean(progress.effectsOff));
  music?.setVolume(volume);
  music?.setMuted(progress.muted);
  menus?.setSoundIcon(progress.muted);
  const doc = globalThis.document;
  const musicButton = doc?.getElementById('music-volume-toggle');
  if (musicButton) musicButton.dataset.value = musicLabel(volume);
  const effectsButton = doc?.getElementById('effects-toggle');
  if (effectsButton) effectsButton.dataset.value = progress.effectsOff ? 'Off' : 'On';
}
