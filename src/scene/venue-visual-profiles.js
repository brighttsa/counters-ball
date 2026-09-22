const profiles = {
  schoolyard: { surfaceLabel: 'Sun-bleached concrete', construction: 'slab', goal: 'painted',
    surface: { kind: 'concrete', base: '#bcbeb3' }, edge: '#507b99', depth: 0.16,
    markings: { color: '#f4ebd6', width: 5, alpha: 0.8, jitter: 2, blur: 2 } },
  kiosk: { surfaceLabel: 'Taped carton counter', construction: 'counter', goal: 'wire',
    surface: { kind: 'cardboard', base: '#b99c71', taped: true }, edge: '#ded9bc', depth: 0.25,
    markings: { color: '#303d38', width: 3, alpha: 0.85, jitter: 0.8, blur: 0 } },
  veranda: { surfaceLabel: 'Varnished honey plywood', construction: 'stools', goal: 'lashed',
    surface: { kind: 'wood', base: '#b98a55', grain: '#7a5230', dark: '#4e331c', varnished: true }, edge: '#79532f', depth: 0.065,
    markings: { color: '#eee4be', width: 4, alpha: 0.9, jitter: 0.5, blur: 0 } },
  roadside: { surfaceLabel: 'Reclaimed painted planks', construction: 'trestles', goal: 'steel',
    surface: { kind: 'wood', base: '#918272', grain: '#554a37', dark: '#392f25', painted: true, planks: 6 }, edge: '#705549', depth: 0.10,
    markings: { color: '#e5debd', width: 7, alpha: 0.75, jitter: 2, blur: 0 } },
  harmattan: { surfaceLabel: 'Dusty flattened carton', construction: 'platform', goal: 'twigs',
    surface: { kind: 'cardboard', base: '#c9af87', dusty: true }, edge: '#9d8960', depth: 0.045,
    markings: { color: '#f1e5c7', width: 5, alpha: 0.43, jitter: 4, blur: 5 } },
  night: { surfaceLabel: 'Salt-worn carved desk', construction: 'desk', goal: 'pvc',
    surface: { kind: 'wood', base: '#51443a', grain: '#302c27', dark: '#211e19', salt: true, planks: 5,
      carvings: ['KOJO', 'BLACK STARS', 'E.A. + K.'] }, edge: '#353d3c', depth: 0.12,
    markings: { color: '#dcd8bd', width: 3, alpha: 0.92, jitter: 0.3, blur: 0 } },
};
for (const [key, profile] of Object.entries(profiles)) {
  profile.key = key;
  if (profile.surface.carvings) Object.freeze(profile.surface.carvings);
  Object.freeze(profile.surface); Object.freeze(profile.markings); Object.freeze(profile);
}

/** Backdrop keys are canonical; attract mode uses the kiosk construction. */
export function getVenueVisualProfile(key = 'kiosk') {
  return profiles[key === 'nightbulb' ? 'night' : key] ?? profiles.kiosk;
}
