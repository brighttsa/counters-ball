// The player's audio preferences, saved with their progress:
//   muted        the ♪ button: all sound off (music and effects)
//   musicVolume  Settings "Music": Off / Low / Med / High
//   effectsOff   Settings "Effects": flicks, contacts, whistles and street ambience off
// The Settings chips live on the back of the pause card (ui/pause-card-faces-and-setting-chips.js).
import { markChoice } from '../ui/pause-card-faces-and-setting-chips.js';

export const MUSIC_LEVELS = [
  { value: 0, label: 'Off' }, { value: 0.35, label: 'Low' }, { value: 0.7, label: 'Medium' }, { value: 1, label: 'High' },
];
export const DEFAULT_MUSIC_VOLUME = 0.7;

/** Push the saved preferences into the sound board, the music and the controls that show them. */
export function applyAudioSettings({ progress, sound, music, menus }) {
  const volume = progress.musicVolume ?? DEFAULT_MUSIC_VOLUME;
  sound.setMuted(progress.muted);
  sound.setEffectsOff?.(Boolean(progress.effectsOff));
  music?.setVolume(volume);
  music?.setMuted(progress.muted);
  menus?.setSoundIcon(progress.muted);
  markChoice('music', volume);
  markChoice('effects', progress.effectsOff ? 'off' : 'on');
}
