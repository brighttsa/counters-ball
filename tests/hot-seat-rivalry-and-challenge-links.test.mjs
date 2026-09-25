import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanPlayerName, cleanPlayerNames, rivalryTally, recordRivalryResult, rivalryLine, createSeries, seriesForNames,
  recordSeriesGame, nextSeriesGame, seriesKickoffSide, seriesKickoffCallout, seriesResultLine, HotSeatRivalry,
} from '../src/core/hot-seat-series-and-rivalry-record.js';
import {
  encodeChallenge, decodeChallenge, stripChallengeParams, compareToChallenge, markText, challengeVerdictLine,
} from '../src/core/challenge-link-codec-and-comparison.js';
import {
  encodeFriendInvite, decodeFriendInvite, stripFriendInviteParams, friendInviteLine,
} from '../src/core/friend-match-invite-links.js';
import { buildFriendInvite } from '../src/ui/friend-match-invite-share.js';
import { buildResultShare } from '../src/ui/share-results-and-challenge-link.js';
import { fullTimeTitle } from '../src/ui/ui-full-time-results-card.js';
import { CAMPAIGN_LEVELS } from '../src/levels/campaign-level-definitions.js';
import { STREET_LEGENDS_ACTS } from '../src/levels/street-legends-acts-and-unlocks.js';

const names = { home: 'Ama', away: 'Kofi' };
const result = (home, away, flicks = 5, starFlags = [home > away, away === 0, false]) => ({
  winner: home > away ? 'home' : away > home ? 'away' : null, scores: { home, away },
  flicksUsed: { home: flicks, away: 4 }, starFlags,
});

test('player names are trimmed, capped, stripped of control characters and never the same twice', () => {
  assert.equal(cleanPlayerName('  Ama   Serwaa  ', 'x'), 'Ama Serwaa');
  assert.equal(cleanPlayerName('Nana\u0000Yaw\u001b', 'x'), 'NanaYaw');
  assert.equal(cleanPlayerName('Abcdefghijklmnop', 'x').length, 12);
  assert.equal(cleanPlayerName('   ', 'Player 1'), 'Player 1');
  assert.deepEqual(cleanPlayerNames({}), { home: 'Player 1', away: 'Player 2' });
  assert.deepEqual(cleanPlayerNames({ home: 'Kofi', away: 'kofi' }), { home: 'Kofi', away: 'kofi 2' });
});

test('the head-to-head record ignores seat order and letter case', () => {
  const progress = { stars: {} };
  assert.equal(rivalryLine(rivalryTally(progress, names), names), 'First meeting: Ama vs Kofi');
  recordRivalryResult(progress, names, 'home');
  recordRivalryResult(progress, { home: 'kofi', away: 'AMA' }, 'home'); // swapped seats, Kofi wins
  recordRivalryResult(progress, names, null);
  const tally = rivalryTally(progress, names);
  assert.deepEqual(tally, { home: 1, away: 1, draws: 1 });
  assert.equal(rivalryLine(tally, names), 'All time: Ama 1 – 1 Kofi, 1 drawn');
  assert.equal(Object.keys(progress.rivalries).length, 1);
});

test('a series is first to two wins; draws do not count and kick-off alternates', () => {
  const series = createSeries(names);
  assert.equal(seriesKickoffSide(series), 'home');
  assert.deepEqual(seriesKickoffCallout(series), { label: 'GAME 1', detail: 'First to 2 wins' });
  recordSeriesGame(series, 'away');
  assert.equal(seriesResultLine(series), 'Series Kofi leads 1–0');
  nextSeriesGame(series);
  assert.equal(seriesKickoffSide(series), 'away');
  assert.deepEqual(seriesKickoffCallout(series), { label: 'GAME 2', detail: 'Kofi leads 1–0' });
  recordSeriesGame(series, null);
  nextSeriesGame(series);
  recordSeriesGame(series, 'home');
  assert.equal(series.winner, null);
  assert.equal(seriesResultLine(series), 'Series level at 1–1');
  nextSeriesGame(series);
  recordSeriesGame(series, 'away');
  assert.equal(series.winner, 'away');
  assert.equal(seriesResultLine(series), 'Kofi takes the series 2–1');
  const fresh = nextSeriesGame(series);
  assert.deepEqual([fresh.game, fresh.wins, fresh.winner], [1, { home: 0, away: 0 }, null]);
});

test('new names or swapped seats start a new series; the same pair carries on', () => {
  const series = recordSeriesGame(createSeries(names), 'home');
  assert.equal(seriesForNames(series, { home: 'ama', away: 'KOFI' }), series);
  assert.notEqual(seriesForNames(series, { home: 'Kofi', away: 'Ama' }), series);
  assert.notEqual(seriesForNames(series, { home: 'Ama', away: 'Esi' }), series);
});

test('HotSeatRivalry seats the typed names, counts results and saves them', () => {
  const progress = { stars: {}, muted: false };
  const saves = [];
  const table = new HotSeatRivalry(progress, (p) => saves.push(JSON.parse(JSON.stringify(p))));
  const live = table.names;
  assert.deepEqual(live, { home: 'Player 1', away: 'Player 2' });
  assert.equal(table.rivalryFor({ home: ' Ama ', away: 'Kofi' }), 'First meeting: Ama vs Kofi');
  const kick = table.seat({ home: ' Ama ', away: 'Kofi' });
  assert.equal(table.names, live, 'the object handed to the match session stays the same');
  assert.deepEqual(live, names);
  assert.deepEqual(kick, { side: 'home', label: 'GAME 1', detail: 'First to 2 wins' });
  assert.deepEqual(table.finish('home'), ['Series Ama leads 1–0', 'All time: Ama 1 – 0 Kofi']);
  assert.equal(table.seriesDecided, false);
  table.rematch();
  assert.equal(table.seat(names).side, 'away');
  table.finish('home');
  assert.equal(table.seriesDecided, true);
  assert.deepEqual(saves.at(-1).versusNames, names);
  assert.deepEqual(saves.at(-1).rivalries, { 'ama|kofi': { wins: { ama: 2 }, draws: 0 } });
  assert.equal(new HotSeatRivalry(saves.at(-1), () => {}).names.home, 'Ama');
});

test('a challenge link round-trips and rejects anything malformed', () => {
  const query = encodeChallenge({ levelId: 'legends-roadside-act-2', mode: 'legends', scores: { home: 2, away: 1 }, flicks: 7 });
  assert.deepEqual(decodeChallenge(query),
    { levelId: 'legends-roadside-act-2', mode: 'legends', scores: { home: 2, away: 1 }, flicks: 7 });
  for (const bad of ['', '?beat=kiosk', '?beat=kiosk&m=versus&s=1-0&f=3', '?beat=%3Cscript%3E&m=campaign&s=1-0&f=3',
    '?beat=kiosk&m=campaign&s=100-0&f=3', '?beat=kiosk&m=campaign&s=1-0&f=0', '?beat=kiosk&m=campaign&s=1-0&f=1.5',
    '?beat=kiosk&m=campaign&s=1-0&f=1000']) {
    assert.equal(decodeChallenge(bad), null, bad);
  }
  assert.equal(stripChallengeParams('http://x.test/?beat=kiosk&m=campaign&s=1-0&f=3&debug=1'), 'http://x.test/?debug=1');
});

test('a Friend Match Lite invite names a table without faking a score', () => {
  const level = STREET_LEGENDS_ACTS.find((act) => act.id === 'legends-schoolyard-act-2');
  const query = encodeFriendInvite({ levelId: level.id, mode: 'legends' });
  assert.deepEqual(decodeFriendInvite(query), { levelId: level.id, mode: 'legends' });
  assert.equal(decodeFriendInvite('?friend=legends-schoolyard-act-2&fm=versus'), null);
  assert.equal(stripFriendInviteParams(`http://x.test/${query}&debug=1`), 'http://x.test/?debug=1');
  assert.match(friendInviteLine(level), /Your friend called you to/);
  const invite = buildFriendInvite(level, 'legends', 'http://x.test/');
  assert.equal(new URL(invite.url).search, query);
  assert.match(invite.text, /Play it, send your mark back/);
});

test('a result beats a mark by outcome, then goal difference, then fewer flicks', () => {
  const mark = { scores: { home: 2, away: 1 }, flicks: 6 };
  assert.equal(compareToChallenge(result(1, 0, 9), mark), 'short', 'same margin, more flicks');
  assert.equal(compareToChallenge(result(3, 1, 12), mark), 'beat', 'bigger margin beats fewer flicks');
  assert.equal(compareToChallenge(result(2, 1, 5), mark), 'beat');
  assert.equal(compareToChallenge(result(3, 2, 6), mark), 'matched');
  assert.equal(compareToChallenge(result(0, 0, 1), mark), 'short', 'a draw never beats a win');
  assert.equal(markText({ scores: { home: 1, away: 1 }, flicks: 1 }), 'drew 1–1 in 1 flick');
  assert.equal(challengeVerdictLine(result(2, 0, 4), mark), 'You beat their mark (won 2–1 in 6 flicks).');
});

test('sharing a win against the AI carries a link that opens the same table', () => {
  const level = STREET_LEGENDS_ACTS.find((act) => act.backdrop === 'kiosk' && act.legend.act === 2);
  const share = buildResultShare(result(2, 0, 5), level, 'legends',
    { baseUrl: 'http://x.test/', title: "That's yours.", homeColour: '#d6503a' });
  assert.match(share.text, new RegExp(`^${level.opponent.kid} gave me a game at ${level.name}, Act 2. I won 2–0 in 5 flicks`));
  const challenge = decodeChallenge(new URL(share.url).search);
  assert.deepEqual(challenge, { levelId: level.id, mode: 'legends', scores: { home: 2, away: 0 }, flicks: 5 });
  assert.deepEqual(share.card.stars, [true, true, false]);
});

test('sharing a 2-Player result names the players and carries no challenge', () => {
  const level = CAMPAIGN_LEVELS[1];
  const notes = ['Kofi takes the series 2–1', 'All time: Ama 4 – 6 Kofi'];
  const share = buildResultShare(result(1, 2), level, 'versus',
    { baseUrl: 'http://x.test/', title: 'Kofi takes it.', homeColour: '#d6503a', names, versusNotes: notes });
  assert.equal(share.url, 'http://x.test/');
  assert.equal(share.text, `Kofi took the table from Ama 2–1 at ${level.name}. KONK! ${notes.join('. ')}.`);
  assert.equal(share.card.stars, null);
  assert.equal(fullTimeTitle(result(1, 2), level, 'versus', names), 'Kofi takes it.');
  assert.equal(fullTimeTitle(result(1, 1), level, 'versus', names), 'Nothing between you.');
});

test('saved names and head-to-head records load back; malformed ones are dropped', async () => {
  const store = new Map();
  globalThis.window = { localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) } };
  const { loadProgress, saveProgress } = await import('../src/core/save-progress-local-storage.js');
  saveProgress({ stars: {}, muted: false, versusNames: names, rivalries: {
    'ama|kofi': { wins: { ama: 2, kofi: 1 }, draws: 1 }, broken: { wins: { x: -1 }, draws: 0 }, alsoBroken: 'nope' } });
  const loaded = loadProgress();
  assert.deepEqual(loaded.versusNames, names);
  assert.deepEqual(loaded.rivalries, { 'ama|kofi': { wins: { ama: 2, kofi: 1 }, draws: 1 } });
  store.set([...store.keys()][0], JSON.stringify({ stars: {}, versusNames: { home: '', away: 'x' }, rivalries: [] }));
  assert.deepEqual(loadProgress(), { stars: {}, muted: false });
});

test('a friend\'s link opens its own table and no other; 2-Player tables are always open', async () => {
  const { isTrackLevelUnlocked, trackFor, challengeForLevel } = await import('../src/levels/level-tracks-and-challenge-unlocks.js');
  const progress = { stars: {} };
  const index = trackFor('legends').findIndex((act) => act.id === 'legends-kiosk-act-2');
  const challenge = { levelId: 'legends-kiosk-act-2', mode: 'legends', index };
  assert.equal(isTrackLevelUnlocked(progress, 'legends', index), false);
  assert.equal(isTrackLevelUnlocked(progress, 'legends', index, challenge), true);
  assert.equal(isTrackLevelUnlocked(progress, 'legends', index + 1, challenge), false);
  assert.equal(isTrackLevelUnlocked(progress, 'versus', 5), true);
  assert.equal(challengeForLevel(challenge, trackFor('legends')[index + 1]), null);
  assert.equal(trackFor('versus'), CAMPAIGN_LEVELS);
});

test('reading a challenge from the URL strips it and resolves its table', async () => {
  const { takeChallengeFromUrl, takeFriendInviteFromUrl } = await import('../src/levels/level-tracks-and-challenge-unlocks.js');
  const replaced = [];
  const hist = { replaceState: (_, __, url) => replaced.push(url) };
  const at = (href) => ({ href, search: new URL(href).search });
  const found = takeChallengeFromUrl(at('http://x.test/?beat=kiosk&m=campaign&s=2-0&f=5'), hist);
  assert.deepEqual(found, { levelId: 'kiosk', mode: 'campaign', scores: { home: 2, away: 0 }, flicks: 5, index: 1 });
  assert.equal(takeChallengeFromUrl(at('http://x.test/?beat=nowhere&m=campaign&s=2-0&f=5'), hist), null);
  assert.equal(takeChallengeFromUrl(at('http://x.test/'), hist), null);
  const invite = takeFriendInviteFromUrl(at('http://x.test/?friend=legends-roadside-act-1&fm=legends'), hist);
  const roadside = STREET_LEGENDS_ACTS.findIndex((act) => act.id === 'legends-roadside-act-1');
  assert.deepEqual(invite, { levelId: 'legends-roadside-act-1', mode: 'legends', index: roadside });
  assert.equal(takeFriendInviteFromUrl(at('http://x.test/?friend=nowhere&fm=legends'), hist), null);
  assert.deepEqual(replaced, ['http://x.test/', 'http://x.test/', 'http://x.test/', 'http://x.test/']);
});

test('every [data-action] button in index.html has a route', async () => {
  const { readFile } = await import('node:fs/promises');
  const { createMenuActions } = await import('../src/ui/menu-button-action-routes.js');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const used = new Set([...html.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]));
  const routes = createMenuActions({ app: {}, progress: {}, flow: {} });
  assert.ok(used.size > 20);
  for (const action of used) assert.equal(typeof routes[action], 'function', action);
});
