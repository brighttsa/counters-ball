// Goal clip: while the replay of a great goal plays, the canvas (and the game's sound) is recorded into a
// few seconds of video. The results card then offers "Share goal clip", so a goal can go straight into a
// chat or a story. Recording uses the browser's own MediaRecorder: MP4 where supported (Safari, recent
// Chrome), WebM otherwise. Browsers without it simply never show the button.
const pickType = () => ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
  .find((type) => globalThis.MediaRecorder?.isTypeSupported?.(type)) ?? null;

export function createGoalClipSharing({ canvas, sound, button, status }) {
  let recorder = null, clip = null, audioOut = null;

  /** The game's effects and music, mirrored into the recording (connecting twice is harmless). */
  function audioTracks() {
    try {
      if (!sound.ctx) return [];
      audioOut ??= sound.ctx.createMediaStreamDestination();
      sound.compressor?.connect(audioOut);
      sound.music?.dip?.connect(audioOut);
      return audioOut.stream.getAudioTracks();
    } catch { return []; }
  }

  function start() {
    const type = pickType();
    if (!type || !canvas.captureStream || recorder) return;
    try {
      const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...audioTracks()]);
      const chunks = [];
      recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 2_500_000 });
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        stream.getVideoTracks().forEach((track) => track.stop());
        recorder = null;
        if (!chunks.length) return;
        clip = new Blob(chunks, { type: type.split(';')[0] });
        button.hidden = false;
      };
      recorder.start();
    } catch { recorder = null; }
  }

  function stop() { if (recorder?.state === 'recording') recorder.stop(); }

  return {
    /** A new match: forget the last clip. */
    reset() { stop(); clip = null; button.hidden = true; status.textContent = ''; },
    /** Called by the match when a goal replay starts (true) and ends (false); only the player's goals record. */
    onGoalReplay(active, { byHuman = false } = {}) { if (!active) stop(); else if (byHuman) start(); },
    async share() {
      if (!clip) return;
      const file = new File([clip], `konk-goal.${clip.type.includes('mp4') ? 'mp4' : 'webm'}`, { type: clip.type });
      try {
        if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: 'KONK! konk.world' }); return; }
        const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: file.name });
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 4000);
        status.textContent = 'Goal clip saved to your downloads.';
      } catch (error) {
        if (error?.name !== 'AbortError') status.textContent = 'Could not share the clip. Try again.';
      }
    },
  };
}
