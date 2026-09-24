// Makes a decoded track loop without a click or a jump: over the last SEAM seconds before loopEnd, the audio
// is blended (equal power) into the audio that leads up to loopStart. When playback wraps from loopEnd back to
// loopStart it is then already playing what comes just before loopStart, so the join is continuous to the
// sample. Works on the decoded copy in memory; the audio files are never changed.
export const LOOP_SEAM_SECONDS = 0.15;

/**
 * @param channels Float32Array per channel (mutated in place)
 * @param sampleRate the channels' sample rate
 * @param loopStart / loopEnd seconds
 */
export function bakeLoopSeam(channels, sampleRate, loopStart, loopEnd, seam = LOOP_SEAM_SECONDS) {
  const start = Math.round(loopStart * sampleRate), end = Math.round(loopEnd * sampleRate);
  const length = Math.min(Math.round(seam * sampleRate), start, end - start);
  if (!(length > 0) || end > channels[0].length) return false;
  for (const data of channels) {
    for (let k = 0; k < length; k++) {
      const t = (k + 0.5) / length, i = end - length + k;
      data[i] = data[i] * Math.cos(t * Math.PI / 2) + data[start - length + k] * Math.sin(t * Math.PI / 2);
    }
  }
  return true;
}
