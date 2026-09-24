// KONK!'s soundtrack: the owner's three original recordings, and which one each screen plays. Web copies of
// the originals (128 kbps, cover art removed) live in assets/audio/; the originals are kept outside the repo.
//
// Each track plays its opening once, then loops [loopStart, loopEnd): the region between the end of its
// intro build and the start of its ending (a wind-down, or Three-Contact Motif's hard stop), chosen where the
// music just before loopEnd matches the music just before loopStart, and joined with a short baked crossfade
// (soundtrack-loop-seam.js). Found by an offline search over each recording's rhythm and level; the loop
// lengths came out the same over repeated searches for the first two, which marks a real musical repeat.
export const SOUNDTRACK = {
  // Brightest of the three: kept to the menus, where there are almost no sound effects to mask.
  home: { url: 'assets/audio/konk-home-theme-three-contact-motif.mp3', title: 'Three-Contact Motif',
    loopStart: 19.18, loopEnd: 145.3994, trim: 0.95 },
  // Steadiest level and least treble: sits under the cap clinks, bottle tinks and flick snaps.
  classic: { url: 'assets/audio/konk-classic-match-found-object-groove.mp3', title: 'Found Object Groove',
    loopStart: 14.1, loopEnd: 127.223, trim: 1 },
  // Longest and dark: the Street Legends acts run long, and the effects stay clear.
  legends: { url: 'assets/audio/konk-street-legends-bottle-cap-challenge.mp3', title: 'Bottle Cap Challenge',
    loopStart: 18.66, loopEnd: 169.1941, trim: 1 },
};

/** The track a match in this mode plays: Street Legends has its own; Classic, 2-Player and Kwame's Corner share one. */
export const matchTrackFor = (mode) => (mode === 'legends' ? 'legends' : 'classic');

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
  // Play again, Restart and Next act pass through the intro card: the match music carries on through it.
  if (screen === 'intro' && playing === match) return { id: match, dip: false };
  return { id: 'home', dip: false };
}
