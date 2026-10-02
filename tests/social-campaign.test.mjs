import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { posters, formats, captions, palettes, venues } from '../social/data/campaign.js';

test('campaign contains all ten hero posters and eight distinct recurring formats', () => {
  assert.equal(posters.filter(p => p.group === 'Campaign').length, 10);
  assert.equal(posters.filter(p => p.group === 'Series').length, 8);
  assert.equal(new Set(posters.map(p => p.id)).size, 25);
  assert.equal(posters.filter(p => p.motion).length, 7);
  for (const p of posters) {
    assert.ok(palettes[p.palette]); assert.ok(venues[p.venue]);
    assert.ok(p.headline && p.subheadline && p.cta && p.caption);
    assert.ok(p.signature.includes('YƐ KONKI!'));
  }
});
test('exact platform sizes and supplied captions retain Twi characters', () => {
  assert.deepEqual(Object.values(formats).map(f => [f.width, f.height]), [[1080, 1350], [1080, 1080], [1600, 900], [1080, 1920]]);
  assert.equal(Object.keys(captions).length, 7);
  assert.ok(captions.community.includes('#YɛKonki'));
  assert.ok(captions.community.includes('YƐ KONKI!'));
});
test('Twi-first template preserves the exact supplied wording and six-second sequence', () => {
  const p = posters.find(p => p.id === '19-twi-first');
  assert.equal(p.headline, 'YƐ KONKI!'); assert.equal(p.question, 'Wo nim counters ball?');
  assert.equal(p.closing, 'KONKERS, mo ayɛ ready?'); assert.equal(p.caption, captions.twi);
  assert.equal(p.motionDuration, 6); assert.ok(p.subheadline.includes('ONE CLEAN KONK!'));
});
test('all campaign imagery and existing brand references are local and real', () => {
  for (const name of [...Object.keys(venues), 'cap-red', 'cap-rival', 'paper-ball']) assert.ok(existsSync(new URL(`../social/assets/${name}.png`, import.meta.url)));
  const component = readFileSync(new URL('../social/components/poster.js', import.meta.url), 'utf8');
  assert.ok(component.includes('/assets/konk-logo.svg')); assert.ok(component.includes('textContent'));
  assert.ok(!component.includes('innerHTML'));
});
test('exports have exact PNG dimensions for every composition', () => {
  for (const [format, { width, height }] of Object.entries(formats)) for (const p of posters) {
    const buffer = readFileSync(new URL(`../social/exports/${format}/${p.id}.png`, import.meta.url));
    assert.equal(buffer.readUInt32BE(16), width); assert.equal(buffer.readUInt32BE(20), height);
  }
});
