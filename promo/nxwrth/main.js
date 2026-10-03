import { createPromoCinematic } from './promo-cinematic.js?v=9';
import { PromoAudioClock } from './promo-audio-clock.js?v=3';
import { createPromoRecorder } from './promo-recorder.js?v=4';
import { createPromoImpactSound } from './promo-impact-sound.js?v=2';
import { DEFAULT_FILM_LENGTH, DEFAULT_TAG_TIME, shouldReveal } from './promo-timeline.js?v=2';

const $ = (id) => document.getElementById(id);
const canvas = $('promo-canvas'), typeCanvas = $('promo-type-canvas'), frame = $('film-frame');
const tagInput = $('tag-time'), startInput = $('section-start'), lengthInput = $('film-length');
const audio = new Audio(); audio.preload = 'auto'; audio.crossOrigin = 'anonymous';
const audioClock = new PromoAudioClock(audio, { onStatus: (text) => { $('audio-status').textContent = text; } });
const cinematic = createPromoCinematic(canvas, typeCanvas);
const recorder = createPromoRecorder(canvas, typeCanvas, audioClock, (text) => { $('audio-status').textContent = text; });
const impactSound = createPromoImpactSound(audioClock);
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let mode = 'idle', paused = false, silentTime = 0, silentAnchor = 0, lastTime = 0;
let duration = DEFAULT_FILM_LENGTH, tagSource = DEFAULT_TAG_TIME, sectionStart = 0;
let captureMode = false, format = '16:9';

function seconds(value) { const n = Number(value); return Number.isFinite(n) ? Math.max(0, n) : 0; }
function relativeTag() { return tagSource - sectionStart; }
function timeNow() { return Math.min(duration, mode === 'silent' ? silentTime : Math.max(0, audioClock.time - sectionStart)); }
function timeLabel(value) { const n = Math.floor(value), mm = String(Math.floor(n / 60)).padStart(2, '0'), ss = String(n % 60).padStart(2, '0'); return `${mm}:${ss}`; }

function updateSetup() {
  sectionStart = seconds(startInput.value);
  tagSource = seconds(tagInput.value);
  duration = Math.min(Number(lengthInput.value) || DEFAULT_FILM_LENGTH,
    audioClock.duration ? Math.max(0, audioClock.duration - sectionStart) : DEFAULT_FILM_LENGTH);
  duration = Math.max(0, Math.min(30, duration));
  $('scrub').max = String(duration);
  $('clock-label').innerHTML = `${timeLabel(timeNow())} <span>/ ${timeLabel(duration)}</span>`;
  const inRange = tagSource >= sectionStart && tagSource < sectionStart + duration;
  $('audio-status').textContent = audioClock.duration
    ? `${audioClock.duration.toFixed(1)}s master · tag ${timeLabel(tagSource)} ${inRange ? 'in section' : 'outside selected film section'}`
    : `Master not loaded · tag cue set to ${timeLabel(tagSource)}`;
}

function setFormat(value) {
  format = value;
  frame.dataset.format = value;
  frame.style.aspectRatio = value.replace(':', ' / ');
  const [w, h] = value.split(':').map(Number);
  frame.style.setProperty('--frame-aspect', `${w} / ${h}`);
  cinematic.resize(frame.clientWidth, frame.clientWidth * h / w);
}

const observer = new ResizeObserver(() => {
  if (!captureMode) cinematic.resize(frame.clientWidth, frame.clientHeight);
});
observer.observe(frame);

function setRunning(nextMode) {
  mode = nextMode;
  paused = false;
  $('load-state').hidden = true;
  $('pause').disabled = false;
  $('play').textContent = 'PLAY FILM';
}

async function playFilm() {
  if (!audioClock.duration) { startSilent(); return; }
  try {
    if (mode !== 'audio' || audio.ended) audioClock.seek(sectionStart + seconds($('scrub').value));
    const playback = audioClock.play();
    impactSound.prepare(audioClock.context);
    await playback;
    setRunning('audio');
  } catch (error) { showError(error.message || 'Audio playback could not start.'); }
}

function startSilent() {
  audioClock.pause();
  if (silentTime >= duration) { silentTime = 0; $('scrub').value = '0'; mode = 'idle'; }
  if (mode !== 'silent') { silentTime = seconds($('scrub').value); silentAnchor = performance.now() / 1000 - silentTime; }
  else if (paused) silentAnchor = performance.now() / 1000 - silentTime;
  setRunning('silent');
  $('scrub').disabled = false;
  $('audio-status').textContent = 'Silent preview · no master audio is being simulated';
}

function pause() {
  if (mode === 'audio') audioClock.pause();
  if (mode === 'silent' && !paused) silentTime = Math.max(0, performance.now() / 1000 - silentAnchor);
  paused = true;
  $('pause').disabled = true;
  $('play').disabled = false;
  $('silent-preview').textContent = 'RESUME SILENT';
}

function seek(value) {
  const target = Math.max(0, Math.min(duration, Number(value) || 0));
  if (mode === 'idle') { mode = 'silent'; paused = true; $('load-state').hidden = true; }
  $('scrub').value = String(target);
  if (mode === 'audio') audioClock.seek(sectionStart + target);
  if (mode === 'silent') { silentTime = target; silentAnchor = performance.now() / 1000 - target; }
  lastTime = target;
  impactSound.reset();
  updateSetup();
}

function showError(message) {
  const error = $('error-state'); error.textContent = message; error.hidden = false;
}

async function loadMaster(file) {
  if (!file) return;
  try {
    await audioClock.load(file);
    $('play').disabled = false;
    $('restart').disabled = false;
    $('scrub').disabled = false;
    $('record').disabled = !recorder.supported;
    updateSetup();
    $('error-state').hidden = true;
  } catch (error) { showError(error.message); }
}
$('audio-file').addEventListener('change', (event) => loadMaster(event.target.files?.[0]));
loadMaster('../../assets/audio/afro-rave35-155bpm-konk-world.mp3');

$('play').addEventListener('click', playFilm);
$('pause').addEventListener('click', pause);
$('restart').addEventListener('click', async () => {
  seek(0); impactSound.reset();
  if (mode === 'silent') startSilent();
  else if (audioClock.duration) playFilm();
});
$('silent-preview').addEventListener('click', () => {
  if (mode === 'silent' && !paused) pause(); else startSilent();
});
$('scrub').addEventListener('input', (event) => seek(event.target.value));
for (const input of [tagInput, startInput, lengthInput]) input.addEventListener('input', updateSetup);
$('beat-entry').addEventListener('input', (event) => { audioClock.beatEntry = seconds(event.target.value); });
$('mute').addEventListener('click', () => {
  audioClock.setMuted(!audioClock.muted);
  $('mute').textContent = audioClock.muted ? 'UNMUTE' : 'MUTE';
  $('mute').setAttribute('aria-pressed', String(audioClock.muted));
});
$('record').addEventListener('click', () => {
  try { if (recorder.recording) recorder.stop(); else { if (mode !== 'audio') throw new Error('Start the master-audio film before recording.'); recorder.start(); } }
  catch (error) { showError(error.message); }
});
$('fullscreen').addEventListener('click', async () => {
  try { await frame.requestFullscreen(); } catch { showError('Full screen is unavailable here.'); }
});
$('capture-mode').addEventListener('click', async () => {
  captureMode = !captureMode;
  document.body.classList.toggle('capture-mode', captureMode);
  if (captureMode) {
    const [width, height] = format === '9:16' ? [1080, 1920] : format === '1:1' ? [1080, 1080] : [1920, 1080];
    try { await frame.requestFullscreen(); } catch { /* Screen-fit capture remains available without fullscreen. */ }
    requestAnimationFrame(() => {
      const aspect = width / height;
      const fitWidth = Math.min(innerWidth, innerHeight * aspect);
      frame.style.width = `${fitWidth}px`;
      frame.style.height = `${fitWidth / aspect}px`;
      cinematic.resize(width, height, width, height);
    });
  } else {
    if (document.fullscreenElement) await document.exitFullscreen();
    frame.style.removeProperty('width'); frame.style.removeProperty('height');
    cinematic.resize(frame.clientWidth, frame.clientHeight);
  }
});
$('canvas-format').addEventListener('change', (event) => setFormat(event.target.value));
document.addEventListener('keydown', async (event) => {
  if (event.key === 'Escape' && captureMode) {
    captureMode = false; document.body.classList.remove('capture-mode');
    frame.style.removeProperty('width'); frame.style.removeProperty('height');
    cinematic.resize(frame.clientWidth, frame.clientHeight);
  }
  if (event.code === 'Space' && !event.target.matches('input,button,select')) { event.preventDefault(); paused ? (mode === 'audio' ? playFilm() : startSilent()) : pause(); }
});
audio.addEventListener('ended', () => { paused = true; audioClock.pause(); $('pause').disabled = true; });
audio.addEventListener('timeupdate', updateSetup);
window.addEventListener('pagehide', () => { observer.disconnect(); audioClock.dispose(); cinematic.dispose(); });

setFormat(format);
updateSetup();
function frameLoop(now) {
  requestAnimationFrame(frameLoop);
  if (mode === 'silent' && !paused) silentTime = Math.max(0, now / 1000 - silentAnchor);
  if (mode === 'audio') audioClock.update();
  const time = timeNow();
  const cue = relativeTag();
  const tag = cue >= 0 && cue < duration ? cue : null;
  if (mode === 'silent' && silentTime >= duration && !paused) { silentTime = duration; pause(); }
  if (mode === 'audio' && time >= duration && !paused) { audioClock.pause(); paused = true; if (recorder.recording) recorder.stop(); }
  const aspect = frame.clientWidth / Math.max(1, frame.clientHeight);
  cinematic.update(time, Math.min(0.05, Math.max(0, time - lastTime)), tag, duration, aspect, motion.matches);
  impactSound.update(time, mode === 'audio' && !paused, duration);
  if (mode !== 'idle') {
    $('scrub').value = String(Math.min(duration, time));
    $('clock-label').innerHTML = `${timeLabel(time)} <span>/ ${timeLabel(duration)}</span>`;
  }
  if (shouldReveal(tag, time, 0) && $('error-state').dataset.tagGate !== 'open') {
    $('error-state').hidden = true;
    $('error-state').dataset.tagGate = 'open';
  }
  lastTime = time;
}
requestAnimationFrame(frameLoop);
