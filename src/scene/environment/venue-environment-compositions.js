// What stands around each table, matched to the pitch's name and place.
// Coordinates are world units (≈19 cm each); the play camera sees the ground
// band z ∈ [-6, -1.8] behind the table, so that is where the life goes.
// Props: [builder, x, z, rotationY, options]. Wall features: x/y/w/h in units,
// y measured up from the ground.

export const VENUE_ENVIRONMENTS = {
  // Adabraka Primary, Accra — playground at break time.
  schoolyard: {
    ground: 'playground',
    wall: { z: -7.2, base: '#e8dcb9', skirting: '#5f8fae', skirtH: 2.2, kerb: 0xb4a78f, features: [
      { type: 'louvreWindow', x: -10.5, y: 4.2, w: 4.2, h: 5.2 },
      { type: 'louvreWindow', x: -4.6, y: 4.2, w: 4.2, h: 5.2 },
      { type: 'door', x: 1.4, w: 3.4, h: 10, color: '#2f5d9a' },
      { type: 'louvreWindow', x: 7.4, y: 4.2, w: 4.2, h: 5.2 },
      { type: 'sign', x: -7.5, y: 11.2, w: 12.5, h: 2.3, text: 'ADABRAKA PRIMARY SCHOOL', bg: '#f3e3bd', fg: '#2f5d9a' },
      { type: 'slogan', x: 9.5, y: 12, text: 'KNOWLEDGE IS LIGHT', color: '#2f5d9a', size: 0.95 },
    ] },
    props: [
      ['schoolBag', -5.4, -4.9, 0.5], ['slippers', 5.2, -3.0, -0.5, { color: '#1d1a17' }],
      ['exerciseBook', -3.4, -3.1, 0.8], ['caps', -1.2, -2.8, 0, { count: 6 }], ['sachets', 6.4, -5.8, 0, { count: 2 }],
    ],
    animals: [['chicken', { variant: 'brown', start: [-2.5, -6.4] }], ['chicken', { variant: 'white', start: [4.5, -6.8] }]],
    shade: 0.5, dust: 60,
  },

  // Nima Market Road — by Kofi's container kiosk.
  kiosk: {
    ground: 'laterite',
    wall: { z: -7.2, base: '#2f6fa0', skirting: '#1f4a6e', skirtH: 0, kerb: 0x9a8d78, features: [
      { type: 'corrugated', y: 0, h: 15, color: '#2f6fa0' },
      { type: 'menu', x: -11, y: 3.6, w: 5.2, h: 6.2, title: 'SOLD HERE', lines: ['Phone credit', 'Pure water', 'Toffee', 'Matches'], bg: '#fdf1d8', fg: '#1f4a6e' },
      { type: 'hatch', x: -2.2, y: 3.6, w: 9.5, h: 5.6 },
      { type: 'sign', x: -2.2, y: 10.8, w: 12, h: 2.6, text: 'KOFI SPOT', bg: '#f0c040', fg: '#b33a25' },
      { type: 'slogan', x: 9, y: 7.2, text: "GOD'S TIME\nIS THE BEST", color: '#fdf1d8', size: 1.1 },
    ] },
    props: [
      ['bottleCrate', -5.6, -5.6, 0.25], ['basinOranges', 5.2, -5.4, 0], ['caps', 0.6, -3.0, 0, { count: 14 }],
      ['sachets', -2.4, -3.4, 0, { count: 4 }], ['slippers', 5.8, -3.0, 1.1, { color: '#2f6fa0' }],
    ],
    animals: [
      ['chicken', { variant: 'brown', start: [-1, -6.6] }], ['chicken', { variant: 'black', start: [2.5, -6] }],
    ],
    shade: 0.2, dust: 90,
  },

  // Auntie Ama's veranda, Kumasi — polished red floor, swept yard, oranges by the door.
  veranda: {
    ground: 'verandaFloor',
    wall: { z: -7.2, base: '#b8633b', skirting: '#4e2518', skirtH: 1.6, kerb: 0x7a2a1f, features: [
      { type: 'shutter', x: -9.5, y: 4.2, w: 4.6, h: 6, color: '#3f7a5a' },
      { type: 'door', x: -1.5, w: 4.2, h: 10.8, color: '#6b4226' },
      { type: 'sign', x: 3.6, y: 8.6, w: 3.8, h: 1.2, text: 'H/No. 14', bg: '#e9d9b4', fg: '#3f7a5a' },
      { type: 'shutter', x: 8.5, y: 4.2, w: 4.6, h: 6, color: '#3f7a5a' },
      { type: 'slogan', x: -9.5, y: 12.4, text: 'AUNTIE AMA', color: '#f3e0b8', size: 0.8 },
    ] },
    props: [
      ['raffiaMat', -5.3, -3.6, 0.12], ['slippers', -5.6, -2.5, 0.35, { color: '#7a3a1c' }],
      ['pottedPlant', 6.4, -6.3, 0], ['pottedPlant', 7.9, -5.7, 0.6], ['basinOranges', 3.8, -6.1, 0], ['caps', 1.2, -3.1, 0, { count: 5 }],
    ],
    shade: 0.55, dust: 70,
  },

  // Tema Motorway Junction — chop bar across an open gutter from the road.
  roadside: {
    ground: 'roadside',
    wall: { z: -7.2, base: '#3a78b5', skirting: '#1f3f60', skirtH: 1.8, kerb: 0x8f8a80, features: [
      { type: 'corrugated', y: 13.2, h: 1.8, color: '#8a5a38' },
      { type: 'menu', x: -6.5, y: 3.4, w: 9, h: 8, title: 'CHOP BAR', lines: ['Waakye', 'Banku & tilapia', 'Kenkey & fish', 'Red red'], bg: '#f0c040', fg: '#8a1e12' },
      { type: 'door', x: 3.2, w: 3.6, h: 9.6, color: '#1f3f60' },
      { type: 'sign', x: 8.8, y: 10.6, w: 10, h: 2.4, text: "MAAME'S CHOP BAR", bg: '#d23b2a', fg: '#fff0d0' },
      { type: 'slogan', x: 9, y: 6, text: 'NO KING\nAS GOD', color: '#fdf1d8', size: 1.0 },
    ] },
    props: [
      ['gutter', 0, -4.8, 0], ['oldTyre', -5.6, -6.6, 0], ['sachets', 2.4, -3.0, 0, { count: 5 }],
      ['coalPot', 6.0, -3.8, 0], ['caps', -1.6, -3.2, 0, { count: 10 }],
    ],
    animals: [
      ['chicken', { variant: 'brown', start: [1.5, -6.6], zone: { minZ: -7.6, maxZ: -5.8 } }],
      ['chicken', { variant: 'white', start: [-3, -7], zone: { minZ: -7.6, maxZ: -5.8 } }],
    ],
    shade: 0, dust: 110,
  },

  // Tamale Lorry Station — harmattan dust, grain sacks, guinea fowl.
  harmattan: {
    ground: 'stationSand',
    wall: { z: -7.2, base: '#d8c29c', skirting: '#9a7a52', skirtH: 1.8, kerb: 0xb8a684, features: [
      { type: 'board', x: -4, y: 4.6, w: 14, h: 6.4, title: 'TAMALE STATION', lines: ['Bolgatanga · 2 hrs', 'Wa · 4 hrs', 'Kumasi · 8 hrs', 'Accra · 12 hrs'] },
      { type: 'door', x: 9.2, w: 3.8, h: 10, color: '#7a4a2a' },
      { type: 'slogan', x: -4, y: 12.6, text: 'SAFE JOURNEY', color: '#7a4a2a', size: 1.0 },
    ] },
    props: [
      ['grainSack', -5.6, -5.8, 0.3], ['grainSack', -4.0, -6.8, -0.7], ['jerrycan', 5.0, -5.4, 0.5],
      ['oldTyre', 7.0, -6.8, 0], ['sachets', 1.1, -3.4, 0, { count: 3 }],
    ],
    animals: [['guineafowl', { start: [-1, -6.2] }], ['guineafowl', { start: [2, -5.6] }], ['guineafowl', { start: [0.5, -7] }]],
    shade: 0, dust: 260, dustSheets: 3,
  },

  // Jamestown, under the kiosk bulb — fishing quay at night.
  night: {
    ground: 'nightConcrete',
    wall: { z: -7.2, base: '#2f5a5a', skirting: '#1b3232', skirtH: 1.2, kerb: 0x6f6a62, features: [
      { type: 'stripes', y: 1.4, h: 2.6, colors: ['#d23b2a', '#f0c040', '#2c6e4b', '#1d130b'] },
      { type: 'hatch', x: -2.4, y: 4.4, w: 9.5, h: 5.4, lit: true },
      { type: 'sign', x: -2.4, y: 11.2, w: 11, h: 2.4, text: 'MAGIC SPOT', bg: '#ffe6a8', fg: '#b33a25', lit: true },
      { type: 'slogan', x: 9.4, y: 7.4, text: 'JAMESTOWN\nNO. 1', color: '#f0c040', size: 1.0 },
    ] },
    props: [
      ['fishingNet', -5.4, -5.6, 0.4], ['coalPot', 5.2, -5.2, 0, { lit: true }], ['caps', 0.2, -3.0, 0, { count: 8 }],
      ['slippers', 3.1, -3.3, -0.9, { color: '#d23b2a' }], ['basinOranges', -2.4, -6.4, 0, { empty: true }],
    ],
    shade: 0, dust: 40,
  },
};
