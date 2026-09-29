const asset = (name) => new URL(`../../assets/audio/foley/${name}-01.mp3`, import.meta.url).href;

export const APPROVED_FOLEY_SAMPLES = Object.freeze({
  'flick-light': [asset('flick-light')],
  'flick-medium': [asset('flick-medium')],
  'flick-hard': [asset('flick-hard')],
  'cap-cap-medium': [asset('cap-cap-medium')],
  'cap-cap-hard': [asset('cap-cap-hard')],
  'cap-ball-light': [asset('cap-ball-light')],
  'cap-ball-medium': [asset('cap-ball-medium')],
  'cap-ball-hard': [asset('cap-ball-hard')],
  'post-light': [asset('post-light')],
  'post-hard': [asset('post-hard')],
  'slide-cardboard-clean': [asset('slide-cardboard-clean')],
  'slide-cardboard-dusty': [asset('slide-cardboard-dusty')],
  'slide-wood-worn': [asset('slide-wood-worn')],
});

export function forceTier(strength) {
  if (strength < 0.3) return 'light';
  if (strength < 0.68) return 'medium';
  return 'hard';
}

export function surfaceSlideKey(surface = 'cardboard', dusty = false) {
  if (surface === 'wood') return 'slide-wood-worn';
  return dusty ? 'slide-cardboard-dusty' : 'slide-cardboard-clean';
}
