// The development viewer: play, pause, restart, scrub, mute, fullscreen, frame
// format and capture mode, plus keys for tuning the producer-tag time by ear.
//
// URL options:
//   ?format=9:16 | 1:1      frame format (default 16:9)
//   ?capture=1              start in capture mode (no controls, no cursor, from zero)
//   ?tag=12.05              override NXWRTH_TAG_TIME for this session
//   ?export=1&w=1920&h=1080 no playback loop; window.__promo.renderAt(seconds) draws exact frames for the exporter
import { NxwrthPromoDirector } from './nxwrth-promo-director.js';
import { PromoAudioSync } from './promo-audio-master-clock-transport.js';
import {
  FILM_END, FORMATS, DEFAULT_FORMAT, TAG, MUSIC_START, TRACK_IN, MUSIC_OUT, NXWRTH_TAG_TIME, BAR,
} from './nxwrth-promo-timeline-config.js';

const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const exporting = params.has('export');
const frame = $('#frame'), controls = $('#controls'), scrub = $('#scrub'), clock = $('#clock'), status = $('#status'), start = $('#start');

let format = FORMATS[params.get('format')] ? params.get('format') : DEFAULT_FORMAT;
$('#format').value = format;

const director = new NxwrthPromoDirector({ canvas: $('#film'), graphicsCanvas: $('#graphics') });
const audio = new PromoAudioSync();
let lastDrawn = -1, lastFrameAt = performance.now(), scrubbing = false;

function layout() {
  let width, height, ratio = 1;
  if (exporting) {
    width = Number(params.get('w')) || 1920;
    height = Number(params.get('h')) || 1080;
    frame.style.cssText = `left:0;top:0;transform:none;width:${width}px;height:${height}px`;
  } else {
    const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar')) || 0;
    const roomW = window.innerWidth, roomH = window.innerHeight - bar, aspect = FORMATS[format];
    width = Math.floor(Math.min(roomW, roomH * aspect));
    height = Math.floor(width / aspect);
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    ratio = Math.min(window.devicePixelRatio, 2);
  }
  director.resize(width, height, ratio);
  lastDrawn = -1;
}

const trackTime = (film) => film - MUSIC_START + TRACK_IN;

function readout(film) {
  const musical = film >= MUSIC_START && film < MUSIC_OUT;
  const track = musical ? `track ${trackTime(film).toFixed(2)} · bar ${(trackTime(film) / BAR + 1).toFixed(2)}` : 'no music';
  clock.textContent = `${film.toFixed(2)} / ${FILM_END.toFixed(2)} s · ${track} · tag ${NXWRTH_TAG_TIME.toFixed(2)}`;
}

function tick(now) {
  requestAnimationFrame(tick);
  const film = audio.time;
  const dt = Math.min(0.05, (now - lastFrameAt) / 1000);
  lastFrameAt = now;
  if (film === lastDrawn) return; // paused and unchanged: leave the frame alone
  director.renderFrame(film, audio.playing ? dt : 0);
  lastDrawn = film;
  if (!scrubbing) scrub.value = film / FILM_END;
  readout(film);
  controls.querySelector('[data-do="toggle"]').textContent = audio.playing ? 'Pause' : 'Play';
}

/** Reloads with a new tag time: every mark in the edit is derived from it at load. */
function retag(seconds) {
  const next = new URLSearchParams(location.search);
  next.set('tag', seconds.toFixed(3));
  console.info(`NXWRTH_TAG_TIME = ${seconds.toFixed(3)}  (paste into nxwrth-promo-timeline-config.js to keep it)`);
  location.search = next.toString();
}

const actions = {
  async toggle() { start.hidden = true; if (audio.playing) audio.pause(); else await audio.play(); },
  async restart() { start.hidden = true; await audio.seek(0); await audio.play(); },
  /** Replays the hero moment from two seconds out, for checking the sync again and again. */
  async tag() { start.hidden = true; await audio.seek(TAG - 2); await audio.play(); },
  mute() {
    audio.setMuted(!audio.muted);
    controls.querySelector('[data-do="mute"]').setAttribute('aria-pressed', String(audio.muted));
  },
  fullscreen() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); },
  async capture() {
    const on = document.body.classList.toggle('capture');
    layout();
    if (on) { await audio.seek(0); start.hidden = false; } // one click starts a clean take from frame zero; Esc or C leaves
  },
};

function wireControls() {
  controls.addEventListener('click', (event) => {
    const action = event.target.closest('[data-do]')?.dataset.do;
    if (action) actions[action]();
  });
  start.addEventListener('click', () => actions.restart());
  $('#format').addEventListener('change', (event) => { format = event.target.value; layout(); });
  scrub.addEventListener('pointerdown', () => { scrubbing = true; });
  scrub.addEventListener('input', () => audio.seek(Number(scrub.value) * FILM_END));
  window.addEventListener('pointerup', () => { scrubbing = false; });
  window.addEventListener('resize', layout);
  document.addEventListener('fullscreenchange', layout);
  window.addEventListener('keydown', (event) => {
    if (event.target.matches('select')) return;
    const key = event.key.toLowerCase();
    const map = { ' ': 'toggle', r: 'restart', g: 'tag', m: 'mute', f: 'fullscreen', c: 'capture' };
    if (map[key]) { event.preventDefault(); actions[map[key]](); }
    else if (key === 'escape' && document.body.classList.contains('capture')) actions.capture();
    else if (key === 'arrowleft' || key === 'arrowright') audio.seek(audio.time + (key === 'arrowleft' ? -1 : 1) * (event.shiftKey ? 1 : 1 / 30));
    else if (key === '[' || key === ']') retag(NXWRTH_TAG_TIME + (key === '[' ? -0.01 : 0.01));
    else if (key === 't') retag(trackTime(audio.time)); // stamp the tag where the playhead is
  });
}

async function boot() {
  await Promise.all([director.init(), audio.load()]);
  audio.setCues(director.soundCues());
  layout();
  status.textContent = audio.missingTrack ? 'Soundtrack file missing: playing table sounds only. See README.' : '';
  if (exporting) {
    document.body.classList.add('capture');
    window.__promo = {
      duration: FILM_END,
      renderAt(seconds) { director.renderFrame(seconds, 1 / 60); },
      /** The full mix as base64 WAV, so the exporter can write it without a download prompt. */
      async mixWavBase64() {
        const bytes = new Uint8Array(await (await audio.renderOfflineWav()).arrayBuffer());
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(binary);
      },
    };
    director.renderFrame(0);
    document.body.dataset.ready = 'true';
    return;
  }
  wireControls();
  controls.hidden = false;
  start.hidden = false;
  if (params.has('capture')) document.body.classList.add('capture'), layout();
  window.__promo = { director, audio };
  requestAnimationFrame(tick);
}

boot().catch((error) => {
  status.textContent = `Could not build the film: ${error.message}`;
  console.error(error);
});
