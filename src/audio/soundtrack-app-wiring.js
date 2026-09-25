// Connects the soundtrack to the app: every screen change asks the director for that screen's track (it
// ignores a request for what is already playing), the sound board hands over its AudioContext the first
// time a tap or key unlocks audio (browsers allow sound only after one), a hidden tab goes quiet, and the
// saved Music / Sound effects / ♪ preferences are applied from the start.
import { musicForScreen } from './soundtrack-track-list-and-screen-routing.js';
import { applyAudioSettings } from './music-and-effects-audio-settings.js';

export function wireSoundtrack({ app, sound, music, menus, progress }) {
  sound.music = music; // unlock() attaches it; goals duck it
  let lastScreen = null;
  menus.onShow = (screen) => {
    if (lastScreen !== null && screen !== null && screen !== lastScreen) sound.event?.('screenTransition');
    lastScreen = screen;
    const { id, dip } = musicForScreen(screen, app.mode, music.playing ?? music.wanted?.id ?? null);
    music.request(id, { dip });
  };
  window.addEventListener('keydown', () => sound.unlock());
  const onHide = (hidden) => {
    sound.setHidden(hidden);
    music.setHidden(hidden);
  };
  document.addEventListener('visibilitychange', () => onHide(document.hidden));
  window.addEventListener('pagehide', () => onHide(true));
  window.addEventListener('pageshow', () => onHide(false));
  applyAudioSettings({ progress, sound, music, menus });
}
