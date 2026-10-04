// The film's edit decision list. The soundtrack is the master clock: every mark
// below is derived from the track's tempo and two measured positions in it, so
// retiming the film means changing numbers here and nowhere else.
//
// "Track time" is seconds into the audio file. "Film time" is seconds into the
// promo (the film opens with ~3.6 s of table sound before the music enters).

const params = new URLSearchParams(globalThis.location?.search ?? '');
const override = (key, fallback) => (params.has(key) && Number.isFinite(Number(params.get(key))) ? Number(params.get(key)) : fallback);

/**
 * The soundtrack, best source first: the lossless master (local, git-ignored), then the
 * game's own web copy of the same recording, so the film still has its music anywhere it is served.
 */
export const TRACK_URLS = [
  new URL('./audio/nxwrth-afro-rave35-155bpm-konk-world.wav', import.meta.url).href,
  new URL('../../assets/audio/afro-rave35-155bpm-konk-world.mp3', import.meta.url).href,
];

export const BPM = 155;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;

/**
 * TRACK time of the "NORTH!!!" producer tag. NXWRTH's name never appears before this.
 * Measured: the only one-off event in the bounce is a one-beat dropout at 12.00 s,
 * immediately before the drop. Tune by ear with the [ and ] keys in the viewer
 * (or T to stamp the current position), then paste the printed value here.
 * `?tag=12.05` overrides it for a single session.
 */
export const NXWRTH_TAG_TIME = override('tag', 12.0);

/** TRACK time the full beat lands (measured from the waveform). */
export const TRACK_DROP_TIME = override('drop', 12.387);

/** TRACK time where the film's music starts: two bars into the intro. */
export const TRACK_IN = 2 * BAR;

/** FILM time the music enters, on the opening cap-to-cap KONK. */
export const MUSIC_START = 3.6;

/** Frames of grace so the eye confirms what the ear just heard, never the reverse. */
export const REVEAL_LAG = 0.045;

export const trackToFilm = (trackSeconds) => trackSeconds - TRACK_IN + MUSIC_START;

export const TAG = trackToFilm(NXWRTH_TAG_TIME);
export const DROP = trackToFilm(TRACK_DROP_TIME);

/** Film time of a beat in the intro, counted from the music entry. */
export const intro = (bars, beats = 0) => MUSIC_START + bars * BAR + beats * BEAT;
/** Film time of a beat after the drop. */
export const drop = (bars, beats = 0) => DROP + bars * BAR + beats * BEAT;

/** The edit's cut points. Shots and graphics hang off these names. */
export const MARK = {
  open: 0,
  macroLight: 0.45,       // the bulb finds the cap
  pullBack: 1.95,         // behind the cap, the finger's shadow arrives
  release: 3.32,
  konk: MUSIC_START,      // cap meets cap; the beat starts
  overhead: intro(1),
  reimagined: intro(1, 2),
  goalmouth: intro(2),
  bornInGhana: intro(3),
  look: intro(4),
  feel: intro(4, 2),
  rush: intro(5),         // the cutting tightens toward the tag
  tag: TAG,               // "NORTH!!!"
  drop: DROP,
  lockup: drop(1),
  capCollision: drop(2),  // the NXWRTH cap strikes: back into the game
  hasASound: drop(3),
  goalRun: drop(4),
  oneCap: drop(5),
  oneFlick: drop(6),
  whosNext: drop(7),
  black: drop(8),         // hard cut; the music stops with the picture
  endCard: drop(8) + 0.62,
};

export const MUSIC_OUT = MARK.black;
export const FILM_END = MARK.endCard + 3.9;

/** Capture and layout. Titles are composed for 16:9 and kept inside a safe box for 9:16 and 1:1. */
export const FORMATS = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1 };
export const DEFAULT_FORMAT = '16:9';
export const FILM_SEED = 155_2026;

/** KONK! palette (docs/design-guidelines.md) plus the film's paper and ink. */
export const INK = {
  black: '#0c1110', chalk: '#fdf6e6', chalkDim: '#ece1c6', red: '#d4563f', enamel: '#a83b2a',
  gold: '#dfb94f', yellow: '#f5d84a', green: '#2c6e4b', paper: '#e6dcc8', concrete: '#bcbeb3',
};
