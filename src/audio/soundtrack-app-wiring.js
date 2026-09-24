// Connects the soundtrack to the app: every screen change asks the director for that screen's track (it
// ignores a request for what is already playing), the sound board hands over its AudioContext the first
// time a tap or key unlocks audio (browsers allow sound only after one), a hidden tab goes quiet, and the
// saved Music / Sound effects / ♪ preferences are applied from the start.
import { musicForScreen } from './soundtrack-track-list-and-screen-routing.js';
import { applyAudioSettings } from './music-and-effects-audio-settings.js';

export function wireSoundtrack({ app, sound, music, menus, progress }) {
  sound.music = music; // unlock() attaches it; goals duck it
  menus.onShow = (screen) => {
    const { id, dip } = musicForScreen(screen, app.mode, music.playing ?? music.wanted?.id ?? null);
    music.request(id, { dip });
  };
  window.addEventListener('keydown', () => sound.unlock());
  document.addEventListener('visibilitychange', () => sound.setHidden(document.hidden));
  applyAudioSettings({ progress, sound, music, menus });
}
