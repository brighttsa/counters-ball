// Time-of-day lighting presets. Each venue picks one; the stage builder turns
// it into lights + fog, and the post stack reads haze/grain from it.
export const LIGHTING_PRESETS = {
  midday: {
    exposure: 1.0, fog: 0xe7c69a, fogRange: [3.0, 16],
    sun: { color: 0xfff0d8, intensity: 3.05, position: [-2.4, 4.6, 1.6] },
    hemi: { sky: 0xfff4de, ground: 0x9a7048, intensity: 1.02 },
    fill: { color: 0xd8cbb8, intensity: 0.36 },
    haze: { color: [1.0, 0.9, 0.74], amount: 0.052 }, grain: 0.04,
    bulb: null,
  },
  'late-afternoon': {
    exposure: 1.06, fog: 0xd99e63, fogRange: [2.2, 15],
    sun: { color: 0xffbe7d, intensity: 2.9, position: [-4.2, 2.3, 1.1] },
    hemi: { sky: 0xffe2b8, ground: 0x8a5a34, intensity: 0.82 },
    fill: { color: 0xc9b8a4, intensity: 0.42 },
    haze: { color: [1.0, 0.82, 0.6], amount: 0.07 }, grain: 0.048,
    bulb: null,
  },
  'golden-hour': {
    exposure: 1.07, fog: 0xdc8a4f, fogRange: [2.0, 14],
    sun: { color: 0xff9d58, intensity: 3.1, position: [-4.8, 1.45, 0.7] },
    hemi: { sky: 0xffcf9a, ground: 0x7a4a2a, intensity: 0.72 },
    fill: { color: 0xa99ab0, intensity: 0.38 },
    haze: { color: [1.0, 0.72, 0.46], amount: 0.085 }, grain: 0.052,
    bulb: null,
  },
  harmattan: {
    exposure: 1.04, fog: 0xd6c2a4, fogRange: [0.6, 8.5],
    sun: { color: 0xffe4c0, intensity: 1.7, position: [-3.0, 3.2, 1.2] },
    hemi: { sky: 0xf3e3cc, ground: 0xb49474, intensity: 1.15 },
    fill: { color: 0xe0d0bc, intensity: 0.45 },
    haze: { color: [0.95, 0.88, 0.76], amount: 0.16 }, grain: 0.06,
    bulb: null,
  },
  'night-bulb': {
    exposure: 1.12, fog: 0x17151d, fogRange: [2.0, 11],
    sun: { color: 0x7f92c4, intensity: 0.35, position: [-3.5, 3.0, -1.5] },
    hemi: { sky: 0x2c3552, ground: 0x1a120c, intensity: 0.35 },
    fill: { color: 0x6a5a8a, intensity: 0.12 },
    haze: { color: [1.0, 0.7, 0.4], amount: 0.05 }, grain: 0.06,

    bulb: { color: 0xffc27a, intensity: 36, position: [0.25, 2.3, 0.45], angle: 0.95, penumbra: 0.65 },
  },
};

// Small environmental bounce shifts preserve the table's key-light clarity.
const VENUE_BOUNCE = {
  schoolyard: { color: 0xc9deeb, intensity: 0.34 },
  kiosk: { color: 0xa7c9cb, intensity: 0.32 },
  veranda: { color: 0xb8c5a0, intensity: 0.28 },
  roadside: { color: 0xc5d3e0, intensity: 0.42 },
  harmattan: { color: 0xe0d0bc, intensity: 0.45 },
  night: { color: 0x78a9ac, intensity: 0.16 },
};

export function lightingForVenue(lighting, backdrop) {
  const preset = LIGHTING_PRESETS[lighting] ?? LIGHTING_PRESETS['late-afternoon'];
  return { ...preset, fill: VENUE_BOUNCE[backdrop] ?? preset.fill };
}
