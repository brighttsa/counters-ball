export const normalizedStrength = (value) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;

// Abstract broadcast cues, not imitations of local music or recorded voices.
export function playSoundEvent(sound, name, strength = 0.5) {
  const s = normalizedStrength(strength);
  const legacy = { uiHover: 'uiTick', flickRelease: 'flick', softContact: 'ballTap',
    bank: 'woodKnock', goal: 'goalCheer', loss: 'groan' };
  if (Object.hasOwn(legacy, name)) { sound[legacy[name]](s); return; }
  const cues = {
    uiConfirm: [880, 1320, 0.08], aimStart: [330, 440, 0.045],
    hardContact: [160, 80, 0.09], sweetSpot: [2200, 3300, 0.12],
    counter: [220, 660, 0.16], streetPlay: [660, 1320, 0.22],
    matchPoint: [440, 330, 0.3], win: [660, 1320, 0.45],
  };
  const cue = Object.hasOwn(cues, name) ? cues[name] : null;
  if (!cue || !sound.can(`event-${name}`, name === 'hardContact' ? 28 : 100)) return;
  sound.tone({ freq: cue[0], to: cue[1], duration: cue[2], type: 'triangle', gain: 0.04 + s * 0.12 });
  if (name === 'hardContact' || name === 'sweetSpot') {
    sound.noise({ freq: 2400 + s * 2000, duration: 0.018, gain: 0.08 + s * 0.18 });
    sound.tone({ freq: 5400, duration: 0.035, gain: 0.025 + s * 0.04 });
  }
}
