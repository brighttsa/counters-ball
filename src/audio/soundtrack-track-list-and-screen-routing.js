// KONK!'s owner-approved main soundtrack. The intro and producer tag play once,
// then the music loops a 32-bar section with a short baked crossfade.
export const SOUNDTRACK = {
  home: { url: 'assets/audio/afro-rave35-155bpm-konk-world.mp3', title: 'Afro Rave 35 - NXWRTH',
    loopStart: 12.3871, loopEnd: 61.9355, trim: 0.95 },
};

/** The same soundtrack carries through menus and every match mode. */
export const matchTrackFor = () => 'home';

/**
 * What should be playing on this screen.
 * @param screen MenuScreens name: 'title', 'levels', 'challenge', 'intro', 'pause', 'results', or null (the match)
 * @param mode app.mode: 'campaign', 'legends', 'versus' or 'practice'
 * @param playing the track id playing now, if any
 * @returns {{ id: string, dip: boolean }} dip: play it a little quieter (the results card)
 */
export function musicForScreen(screen, mode, playing = null) {
  const match = matchTrackFor(mode);
  if (screen === null || screen === 'match' || screen === 'pause') return { id: match, dip: false };
  if (screen === 'results') return { id: match, dip: true };
  // Play again, Restart and Next act pass through the intro card without restarting the music.
  if (screen === 'intro' && playing === match) return { id: match, dip: false };
  return { id: 'home', dip: false };
}
