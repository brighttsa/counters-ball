import { APPROVED_FOLEY_SAMPLES } from '../../src/audio/approved-foley-sample-manifest.js';

const CUES = [
  { at: 1.72, key: 'slide-wood-worn' },
  { at: 2.36, key: 'flick-hard' },
  { at: 3.38, key: 'cap-cap-hard' },
];

export function createPromoImpactSound(audioClock) {
  let previous = null;
  const keys = ['slide-wood-worn', 'flick-hard', 'cap-cap-hard'];
  const bytes = new Map(keys.map((key) => [key, fetch(APPROVED_FOLEY_SAMPLES[key][0])
    .then((response) => response.ok ? response.arrayBuffer() : null).catch(() => null)]));
  const buffers = new Map();

  async function prepare(context) {
    if (!context) return;
    await Promise.all(keys.map(async (key) => {
      if (buffers.has(key)) return;
      const data = await bytes.get(key);
      if (!data) return;
      try { buffers.set(key, await context.decodeAudioData(data.slice(0))); }
      catch { /* Keep a cue silent when its approved sample cannot be decoded. */ }
    }));
  }

  function play(key) {
    const context = audioClock.context, buffer = buffers.get(key);
    if (!context || !buffer || context.state !== 'running') return;
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = key === 'slide-wood-worn' ? 0.3 : key === 'flick-hard' ? 0.54 : 0.68;
    source.connect(gain).connect(audioClock.master);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start();
  }

  return {
    prepare,
    update(time, enabled = true, duration = 27) {
      if (previous === null) { previous = time; return; }
      if (enabled) CUES.forEach((cue) => { if (previous < cue.at && time >= cue.at) play(cue.key); });
      if (enabled && previous < duration - 1.6 && time >= duration - 1.6) play('cap-cap-hard');
      previous = time;
    },
    reset() { previous = null; },
  };
}
