const FORMATS = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];

export function createPromoRecorder(canvas, typeCanvas, audioClock, onState = () => {}) {
  let recorder = null, tracks = [], compositeFrame = 0;
  const format = FORMATS.find((type) => globalThis.MediaRecorder?.isTypeSupported?.(type));
  return {
    get supported() { return Boolean(format && canvas.captureStream); },
    get recording() { return recorder?.state === 'recording'; },
    start() {
      if (!this.supported || recorder) throw new Error('Video capture is unavailable in this browser.');
      const composite = document.createElement('canvas');
      composite.width = canvas.width; composite.height = canvas.height;
      const context = composite.getContext('2d');
      const paint = () => {
        context.clearRect(0, 0, composite.width, composite.height);
        context.drawImage(canvas, 0, 0, composite.width, composite.height);
        context.drawImage(typeCanvas, 0, 0, composite.width, composite.height);
        compositeFrame = requestAnimationFrame(paint);
      };
      paint();
      tracks = [...composite.captureStream(60).getVideoTracks(), ...audioClock.audioTracks];
      const stream = new MediaStream(tracks), chunks = [];
      recorder = new MediaRecorder(stream, { mimeType: format, videoBitsPerSecond: 12_000_000 });
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        cancelAnimationFrame(compositeFrame);
        tracks.filter((track) => track.kind === 'video').forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: format.split(';')[0] });
        const link = Object.assign(document.createElement('a'), {
          href: URL.createObjectURL(blob), download: `konk-nxwrth-reveal.${format.includes('mp4') ? 'mp4' : 'webm'}`,
        });
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 5000);
        recorder = null;
        onState('Video saved.');
      };
      recorder.start(500);
      onState('Recording · press STOP to save');
    },
    stop() { if (recorder?.state === 'recording') recorder.stop(); },
  };
}
