// The campaign: six venues across Ghana, each a different table, light,
// obstacle layout, rule set and neighbourhood kid to beat.

export const HOME_TEAM = {
  name: 'ACCRA REDS',
  palette: { paint: '#a83b2a', paintDark: '#6f2318', emblemColor: '#efe4cd', emblem: 'star' },
  hudColor: '#d6503a',
};

const TEAMS = {
  blues: { name: 'ADABRAKA BLUES', hudColor: '#4f86c6',
    palette: { paint: '#2f5d9a', paintDark: '#1c3a66', emblemColor: '#e9e2cf', emblem: 'stripes' } },
  greens: { name: 'NIMA GREENS', hudColor: '#3f9b6a',
    palette: { paint: '#2c6e4b', paintDark: '#1a4a30', emblemColor: '#dfb94f', emblem: 'ring' } },
  golds: { name: 'ASHANTI GOLDS', hudColor: '#e0b13e',
    palette: { paint: '#c99a2e', paintDark: '#8a6516', emblemColor: '#2b1a0c', emblem: 'dot' } },
  whites: { name: 'TEMA WHITES', hudColor: '#efe6d2',
    palette: { paint: '#e4dccb', paintDark: '#a89f8c', emblemColor: '#a83b2a', emblem: 'ring' } },
  oranges: { name: 'TAMALE ORANGES', hudColor: '#e8813a',
    palette: { paint: '#d0692a', paintDark: '#8c4115', emblemColor: '#fdf1d8', emblem: 'stripes' } },
  blacks: { name: 'JAMESTOWN STARS', hudColor: '#dfb94f',
    palette: { paint: '#262320', paintDark: '#12100e', emblemColor: '#dfb94f', emblem: 'star' } },
};

const CARDBOARD = { kind: 'cardboard', base: '#bd9163' };

export const CAMPAIGN_LEVELS = [
  {
    id: 'schoolyard', name: 'Schoolyard Break', place: 'Adabraka Primary, Accra',
    blurb: 'Kwame put his toffee on it. Score before the bell.',
    surface: CARDBOARD, lighting: 'midday', backdrop: 'schoolyard', frictionScale: 1,
    obstacles: [],
    rules: { goalsToWin: 1, flickLimit: 12, threeStarFlicks: 3 },
    opponent: { kid: 'Kwame', team: TEAMS.blues, difficulty: 'rookie' },
    tutorial: true,
  },
  {
    id: 'kiosk', name: 'Kiosk Corner', place: 'Nima Market Road',
    blurb: 'Esi knows every mark on Kofi\'s table. Can you find a shot she hasn\'t seen?',
    surface: CARDBOARD, lighting: 'late-afternoon', backdrop: 'kiosk', frictionScale: 1,
    obstacles: [],
    rules: { goalsToWin: 2, flickLimit: 14, threeStarFlicks: 6 },
    opponent: { kid: 'Esi', team: TEAMS.greens, difficulty: 'easy' },
  },
  {
    id: 'veranda', name: 'Veranda Derby', place: 'Auntie Ama\'s Veranda, Kumasi',
    blurb: 'Yaw calls the banks before they happen. The pebbles might have other ideas.',
    surface: { kind: 'wood', base: '#b98a55', grain: '#7a5230', dark: '#4e331c' },
    lighting: 'golden-hour', backdrop: 'veranda', frictionScale: 1,
    obstacles: [{ type: 'pebble', x: 0, z: 0.62 }, { type: 'pebble', x: 0, z: -0.62 }],
    rules: { goalsToWin: 2, flickLimit: 14, threeStarFlicks: 7 },
    opponent: { kid: 'Yaw', team: TEAMS.golds, difficulty: 'medium' },
  },
  {
    id: 'roadside', name: 'Roadside Showdown', place: 'Tema Motorway Junction',
    blurb: 'A bottle and loose change have claimed the middle. Akosua wants the rest.',
    surface: { kind: 'wood', base: '#a67a4c', grain: '#6c4726', dark: '#3f2a16' },
    lighting: 'late-afternoon', backdrop: 'roadside', frictionScale: 1,
    obstacles: [{ type: 'bottle', x: 0.18, z: 0.7 }, { type: 'coins', x: -0.62, z: -0.82 },
      { type: 'coins', x: 0.62, z: 0.84 }],
    rules: { goalsToWin: 3, flickLimit: 16, threeStarFlicks: 10 },
    opponent: { kid: 'Akosua', team: TEAMS.whites, difficulty: 'medium' },
  },
  {
    id: 'harmattan', name: 'Harmattan Haze', place: 'Tamale Lorry Station',
    blurb: 'Dust slows the caps. Abdul already knows how much.',
    surface: { kind: 'cardboard', base: '#c9a57a', dusty: true },
    lighting: 'harmattan', backdrop: 'harmattan', frictionScale: 1.35,
    obstacles: [{ type: 'pebble', x: 0, z: 0.58 }, { type: 'pebble', x: 0.7, z: -0.2 },
      { type: 'pebble', x: -0.7, z: 0.2 }],
    rules: { goalsToWin: 2, flickLimit: 14, threeStarFlicks: 8 },
    opponent: { kid: 'Abdul', team: TEAMS.oranges, difficulty: 'hard' },
  },
  {
    id: 'nightbulb', name: 'Lights Out Final', place: 'Jamestown, under the kiosk bulb',
    blurb: 'Magic owns the table under this bulb. The next match decides whether he keeps it.',
    surface: { kind: 'wood', base: '#5a3a22', grain: '#3a2414', dark: '#21140a', carvings: ['KOJO', 'BLACK STARS', 'E.A. + K.'] },
    lighting: 'night-bulb', backdrop: 'night', frictionScale: 1,
    obstacles: [{ type: 'bottle', x: 0, z: 0.72 }, { type: 'bottle', x: 0, z: -0.72 },
      { type: 'coins', x: 0.95, z: 0.02 }],
    rules: { goalsToWin: 3, flickLimit: 18, threeStarFlicks: 11 },
    opponent: { kid: 'Kofi "Magic"', team: TEAMS.blacks, difficulty: 'champion' },
  },
];

/** Settings for the AI-vs-AI match that plays behind the title screen. */
export const ATTRACT_MODE_LEVEL = {
  ...CAMPAIGN_LEVELS[1],
  id: 'attract',
  rules: { goalsToWin: 99, flickLimit: 999, threeStarFlicks: 0 },
  homeDifficulty: 'medium',
};
