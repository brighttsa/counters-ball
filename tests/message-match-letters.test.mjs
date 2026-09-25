import test from 'node:test';
import assert from 'node:assert/strict';
import {
  packLetter, unpackLetter, encodeLetterLink, decodeLetterSearch, takeLetterFromUrl, cleanTaunt, LETTER_PARAM,
} from '../src/core/message-match-turn-letter-codec.js';
import { MatchRules } from '../src/gameplay/match-rules-turns-goals-and-results.js';

const needsThree = { skip: !process.env.COUNTERS_TEST_THREE };
const rulesAt = (over = {}) => ({ phase: 'aiming', turn: 'home', scores: { home: 1, away: 0 }, flicksUsed: { home: 3, away: 2 },
  lastScorer: 'home', tiebreak: null, tiebreakBonus: { home: 0, away: 0 }, ...over });
const letter = (over = {}) => ({
  levelId: 'schoolyard', names: { home: 'Ama', away: 'Kofi' }, seq: 4, by: 'home',
  before: [-0.5, 0.1234, 0.5, -0.2, 0, 0], rulesBefore: rulesAt(),
  flicks: [{ entry: 0, vx: 2.345, vy: -0.5, after: [-0.1, 0.1, 0.5, -0.2, 0.61, 0.05] }],
  rulesAfter: rulesAt({ turn: 'away', flicksUsed: { home: 4, away: 2 } }), taunt: 'Top bins.', ...over,
});

test('a letter survives the round trip through a link at table precision', () => {
  const url = encodeLetterLink(letter(), 'https://konk.world/');
  assert.ok(url.startsWith(`https://konk.world/?${LETTER_PARAM}=`));
  assert.ok(url.length < 700, `link stays short enough to paste: ${url.length}`);
  const back = decodeLetterSearch(new URL(url).search);
  assert.equal(back.levelId, 'schoolyard');
  assert.deepEqual(back.names, { home: 'Ama', away: 'Kofi' });
  assert.equal(back.by, 'home');
  assert.deepEqual(back.rulesBefore, rulesAt());
  assert.equal(back.rulesAfter.turn, 'away');
  assert.equal(back.taunt, 'Top bins.');
  assert.ok(Math.abs(back.before[1] - 0.1234) < 1e-4);
  assert.ok(Math.abs(back.flicks[0].vx - 2.345) < 1e-3);
  assert.equal(back.flicks[0].after.length, 6);
});

test('edited or broken letters are rejected, never half-applied', () => {
  const good = packLetter(letter());
  const bad = [
    { ...good, v: 2 }, { ...good, l: '../x' }, { ...good, by: 'x' }, { ...good, b: [1, 2, 3] },
    { ...good, f: [] }, { ...good, f: [[9, 1, 1, good.f[0][3]]] }, { ...good, f: [[0, 1.5, 1, good.f[0][3]]] },
    { ...good, f: [[0, 1, 1, [1, 2]]] }, { ...good, b: good.b.map(() => 9e9) },
    { ...good, rb: packLetter(letter({ rulesBefore: rulesAt({ turn: 'away' }) })).rb }, // not the sender's turn
    { ...good, ra: [9, 'h', [0, 0], [0, 0], 0, 0, [0, 0]] },
  ];
  for (const raw of bad) assert.equal(unpackLetter(raw), null, JSON.stringify(raw).slice(0, 80));
  assert.equal(decodeLetterSearch(`?${LETTER_PARAM}=not-base64!!`), null);
  assert.equal(decodeLetterSearch('?other=1'), null);
});

test('names and taunts are cleaned like every other player-typed text', () => {
  const back = unpackLetter(packLetter(letter({ names: { home: '  Ama\u0000 ', away: '' }, taunt: 'x'.repeat(90) })));
  assert.deepEqual(back.names, { home: 'Ama', away: 'Player 2' });
  assert.equal(back.taunt.length, 40);
  assert.equal(cleanTaunt(' a \n\t b\u0007 '), 'a b');
});

test('opening a letter link strips it so a reload does not replay the move', () => {
  const url = new URL(encodeLetterLink(letter(), 'https://konk.world/'));
  let replaced = null;
  const got = takeLetterFromUrl({ search: url.search, href: url.href }, { replaceState: (_s, _t, next) => { replaced = next; } });
  assert.equal(got.seq, 4);
  assert.equal(replaced, 'https://konk.world/');
  assert.equal(takeLetterFromUrl({ search: '', href: 'https://konk.world/' }, { replaceState: () => assert.fail() }), null);
});

test('rules snapshot/restore hands the table over mid-match without firing events', () => {
  const a = new MatchRules({ goalsToWin: 2, flickLimit: 5, threeStarFlicks: 2 }, { home: 'human', away: 'remote' });
  a.start();
  a.registerFlick('home');
  a.registerGoal(1);
  const snap = a.snapshot();
  const b = new MatchRules(a.rules, { home: 'remote', away: 'human' });
  b.on('turn', () => assert.fail('restore must be silent'));
  b.restore(snap);
  assert.deepEqual(b.snapshot(), snap);
  assert.equal(b.isHuman('away'), true);
  assert.equal(b.isHuman('home'), false);
  assert.equal(b.isAi('home'), false, 'a remote side is never handed to the AI');
});

test('the receiver replays the sender\'s flick onto exactly the same table', needsThree, async () => {
  const { fixture, THREE } = await import('./helpers/real-three-session-fixture.mjs');
  const { MessageMatchLetters, readTable } = await import('../src/gameplay/message-match-letter-recorder-and-replayer.js');
  const run = async (s, until) => { for (let i = 0, t = 0; i < 2400 && !until(); i++, t += 1 / 60) { s.update(1 / 60, t); await null; } };

  const { s: sender } = fixture();
  sender.rules.controllers.away = 'remote';
  const sent = [];
  new MessageMatchLetters(sender, { mySide: 'home', levelId: 'schoolyard', names: { home: 'Ama', away: 'Kofi' }, onLetter: (l) => sent.push(l) });
  sender.flick(sender.entries[0], new THREE.Vector2(1.7, 0.35));
  await run(sender, () => sent.length);
  assert.equal(sent.length, 1);
  const wire = unpackLetter(JSON.parse(JSON.stringify(packLetter(sent[0]))));
  assert.equal(wire.flicks.length, 1);
  assert.notDeepEqual(wire.flicks[0].after, wire.before, 'the flick moved something');

  const { s: receiver } = fixture();
  receiver.rules.controllers.home = 'remote';
  receiver.rules.controllers.away = 'human';
  const letters = new MessageMatchLetters(receiver, { mySide: 'away', levelId: 'schoolyard', names: wire.names, onLetter: () => {} });
  let done = false;
  letters.replay(wire).then(() => { done = true; });
  await run(receiver, () => done);
  assert.ok(done, 'replay finished');
  const end = readTable(receiver);
  end.forEach((v, i) => assert.ok(Math.abs(v - wire.flicks[0].after[i]) < 2e-4, `body coord ${i}`));
  assert.equal(receiver.rules.turn, wire.rulesAfter.turn);
  assert.deepEqual(receiver.rules.scores, wire.rulesAfter.scores);
  assert.equal(receiver.rules.canFlick('away'), wire.rulesAfter.turn === 'away');
});
