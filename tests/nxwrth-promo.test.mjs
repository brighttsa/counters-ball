import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  DEFAULT_FILM_LENGTH, DEFAULT_TAG_TIME, ballCueAt, cameraCueAt, capCueAt,
  shouldReveal, timelineTextAt,
} from '../promo/nxwrth/promo-timeline.js';

test('the supplied producer tag time is the 12-second source cue', () => {
  assert.equal(DEFAULT_TAG_TIME, 12);
  assert.equal(DEFAULT_FILM_LENGTH, 27);
});

test('artist name and branded tag copy remain locked until 12.000 seconds', () => {
  const before = timelineTextAt(11.999, 27, 12);
  const at = timelineTextAt(12, 27, 12);
  assert.equal(before.reveal, false);
  assert.doesNotMatch(`${before.text} ${before.sub}`, /NXWRTH/);
  assert.equal(at.text, 'NXWRTH');
  assert.equal(at.reveal, true);
  assert.equal(shouldReveal(12, 11.999), false);
  assert.equal(shouldReveal(12, 12), true);
});

test('an unset or out-of-section tag never leaks into the final card', () => {
  for (const tag of [null, undefined, '', 28]) {
    const card = timelineTextAt(26, 27, tag);
    assert.equal(card.text, 'KONK!');
    assert.doesNotMatch(card.sub, /NXWRTH/);
  }
  assert.equal(shouldReveal(12, 12, 13), false);
  assert.equal(timelineTextAt(12, 27, null).reveal, false);
});

test('final card is preceded by a clean black hold', () => {
  assert.deepEqual(timelineTextAt(25.4, 27, 12), { text: '', sub: '', reveal: true, blackout: true });
  assert.equal(timelineTextAt(25.6, 27, 12).text, 'KONK!');
  assert.equal(timelineTextAt(25.6, 27, 12).blackout, true);
});

test('scrub states are deterministic at macro, tag, and finale cues', () => {
  const first = cameraCueAt(12, 12, 16 / 9);
  const repeated = cameraCueAt(12, 12, 16 / 9);
  assert.deepEqual(first, repeated);
  assert.equal(first.punch, true);
  assert.deepEqual(capCueAt(11.99, 12).reveal, false);
  assert.deepEqual(capCueAt(12, 12).reveal, true);
  assert.ok(Number.isFinite(ballCueAt(9).x));
});

test('camera poses remain finite for landscape, square, and story formats', () => {
  for (const ratio of [16 / 9, 1, 9 / 16]) {
    const pose = cameraCueAt(8.5, 12, ratio);
    assert.ok([...pose.position, ...pose.target, pose.fov].every(Number.isFinite));
    assert.ok(pose.fov > 0 && pose.fov < 90);
  }
});

test('promo is isolated, unindexed, has local master loading and the supported capture controls', async () => {
  const html = await readFile(new URL('../promo/nxwrth/index.html', import.meta.url), 'utf8');
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.match(html, /type="file" accept="audio\/\*"/);
  assert.match(html, /id="capture-mode"/);
  assert.match(html, /id="silent-preview"/);
  assert.match(html, /id="canvas-format"/);
  assert.match(html, /id="promo-type-canvas"/);
  assert.match(html, /id="tag-time"[^>]*value="12"/);
  assert.doesNotMatch(html, /<video\b|visualizer/i);
  const preflight = html.match(/<div id="load-state"[\s\S]*?<\/div>/)?.[0] ?? '';
  assert.doesNotMatch(preflight, /NXWRTH|NORTH!!!/);
});
