import test from 'node:test';
import assert from 'node:assert/strict';
import {
  describeMatch, previewTitle, previewDescription, scoreCardSvg, previewPageHtml,
} from '../match-server/src/match-link-preview-card-and-page.js';

const packed = (over = {}) => ({ v: 1, l: 'kiosk', n: ['Ama', 'Kofi'], k: 4, by: 'h', m: 'Top bins',
  ra: [0, 'a', [2, 1], [3, 2], 'h', 0, [0, 0]], ...over });

test('the preview says the score, whose move it is, the pitch and the taunt', () => {
  const match = describeMatch(packed());
  assert.equal(previewTitle(match), 'Ama 2–1 Kofi · Your move, Kofi');
  assert.equal(previewDescription(match), 'Kiosk Corner. Ama just flicked. “Top bins” Watch it, then flick back in KONK!');
  assert.deepEqual(match.colors, { home: '#d6503a', away: '#3f9b6a' });
  const svg = scoreCardSvg(match);
  for (const text of ['AMA', 'KOFI', '2–1', 'KIOSK CORNER', 'Nima Market Road', 'YOUR MOVE, KOFI', '“Top bins”']) assert.ok(svg.includes(text), text);
});

test('full time names the winner, or calls it square', () => {
  assert.equal(describeMatch(packed({ ra: [1, 'a', [2, 1], [5, 4], 'h', 0, [0, 0]] })).call, 'Full time · Ama wins');
  assert.equal(describeMatch(packed({ ra: [1, 'a', [1, 1], [5, 5], 'h', 'golden', [1, 1]] })).call, 'Full time · all square');
  assert.equal(previewDescription(describeMatch(packed({ m: undefined, ra: [1, 'a', [0, 2], [5, 4], 'a', 0, [0, 0]] }))),
    'Kiosk Corner. Ama took the last flick.');
});

test('player-typed names and taunts cannot inject markup into the card or the page', () => {
  const evil = packed({ n: ['<script>alert(1)</script>', 'Kofi" onload="x'], m: '</title><img src=x onerror=alert(1)>' });
  const match = describeMatch(evil);
  const svg = scoreCardSvg(match);
  const html = previewPageHtml(match, { siteUrl: 'https://konk.world/', matchId: 'abcdefghij', seq: 4 });
  for (const out of [svg, html]) {
    assert.ok(!out.includes('<script>alert'), 'no raw script tag');
    assert.ok(!out.includes('<img src=x'), 'no raw img tag');
    assert.ok(!out.includes('" onload="'), 'no attribute break-out');
  }
  assert.equal((html.match(/<script>/g) ?? []).length, 1, 'only the redirect script');
});

test('the page points chat apps at a per-move card and sends people into the game', () => {
  const html = previewPageHtml(describeMatch(packed()), { siteUrl: 'https://konk.world/', matchId: 'abcdefghij', seq: 4 });
  assert.match(html, /property="og:image" content="https:\/\/konk\.world\/m\/abcdefghij\/card\.png\?s=4"/);
  assert.match(html, /property="og:url" content="https:\/\/konk\.world\/m\/abcdefghij"/);
  assert.match(html, /http-equiv="refresh" content="0; url=https:\/\/konk\.world\/\?m=abcdefghij"/);
  assert.match(html, /location\.replace\("https:\/\/konk\.world\/\?m=abcdefghij"\)/);
  assert.match(html, /og:image:width" content="1200"/);
});
